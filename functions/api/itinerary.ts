interface Env {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
  ITINERARY_PROXY_TOKEN: string;
}

const SHEET_ID = "1Debf-8Bn0FiQmmaxNOXouH0e0wsG9UDd1N2o6oorSA8";
const SHEET_GID = 839733258;
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(email: string, pemKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(encoder.encode(JSON.stringify(claims)))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pemKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64url(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function resolveSheetTitle(accessToken: string): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Sheet metadata fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const sheet = data.sheets.find((s) => s.properties.sheetId === SHEET_GID);
  if (!sheet) throw new Error(`No tab with gid ${SHEET_GID} in spreadsheet ${SHEET_ID}`);
  return sheet.properties.title;
}

async function fetchValues(accessToken: string, title: string): Promise<string[][]> {
  const range = encodeURIComponent(`'${title}'!A:Z`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Values fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.headers.get("x-itinerary-token") !== env.ITINERARY_PROXY_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let values: string[][];
  try {
    const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const title = await resolveSheetTitle(accessToken);
    values = await fetchValues(accessToken, title);
  } catch (err) {
    return new Response(`Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`, {
      status: 502,
    });
  }

  const response = new Response(JSON.stringify({ values }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};
