// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestGet } from "./itinerary";

let testPem: string;

beforeAll(async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const body = b64.match(/.{1,64}/g)!.join("\n");
  testPem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
});

function jsonResponse(body: unknown, { ok = true, status = 200, statusText = "OK" } = {}) {
  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function makeEnv(overrides: Partial<Record<string, string>> = {}) {
  return {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@example.iam.gserviceaccount.com",
    GOOGLE_SERVICE_ACCOUNT_KEY: testPem,
    ITINERARY_PROXY_TOKEN: "correct-token",
    ...overrides,
  };
}

function makeRequest(token = "correct-token") {
  return new Request("https://travel-planner-uk.pages.dev/api/itinerary", {
    headers: { "x-itinerary-token": token },
  });
}

const TOKEN_RESPONSE = { access_token: "google-access-token" };
const METADATA_RESPONSE = {
  sheets: [{ properties: { sheetId: 111, title: "Other" } }, { properties: { sheetId: 839733258, title: "Itinerary" } }],
};
const VALUES_RESPONSE = { values: [["Date", "Activity"], ["7/25/2026", "Museum"]] };

let cachePut: ReturnType<typeof vi.fn>;
let cacheMatch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cachePut = vi.fn().mockResolvedValue(undefined);
  cacheMatch = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("caches", { default: { match: cacheMatch, put: cachePut } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function run(fetchMock: ReturnType<typeof vi.fn>, request = makeRequest(), env = makeEnv()) {
  vi.stubGlobal("fetch", fetchMock);
  const waitUntilPromises: Promise<unknown>[] = [];
  const response = await onRequestGet({
    request,
    env,
    waitUntil: (p: Promise<unknown>) => waitUntilPromises.push(p),
  } as never);
  await Promise.all(waitUntilPromises);
  return response;
}

describe("onRequestGet", () => {
  it("rejects a request with the wrong token", async () => {
    const fetchMock = vi.fn();
    const response = await run(fetchMock, makeRequest("wrong-token"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a cached response without hitting the network", async () => {
    const cached = new Response("cached-body", { status: 200 });
    cacheMatch.mockResolvedValue(cached);
    const fetchMock = vi.fn();

    const response = await run(fetchMock);

    expect(response).toBe(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs a JWT, fetches the sheet, and caches the result on a cache miss", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(METADATA_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(VALUES_RESPONSE));

    const response = await run(fetchMock);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.clone().json()).toEqual({ values: VALUES_RESPONSE.values });

    const valuesCall = fetchMock.mock.calls[2];
    expect(valuesCall[1].headers.Authorization).toBe("Bearer google-access-token");
    expect(cachePut).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the token exchange fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse("bad credentials", { ok: false, status: 401, statusText: "Unauthorized" }),
    );

    const response = await run(fetchMock);

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Token exchange failed");
  });

  it("stringifies a non-Error rejection in the 502 response", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce("network exploded");

    const response = await run(fetchMock);

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("network exploded");
  });

  it("returns 502 when the sheet metadata fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse("nope", { ok: false, status: 403, statusText: "Forbidden" }));

    const response = await run(fetchMock);

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Sheet metadata fetch failed");
  });

  it("returns 502 when no sheet tab matches the configured gid", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({ sheets: [{ properties: { sheetId: 1, title: "Other" } }] }));

    const response = await run(fetchMock);

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("No tab with gid");
  });

  it("returns 502 when the values fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(METADATA_RESPONSE))
      .mockResolvedValueOnce(jsonResponse("nope", { ok: false, status: 500, statusText: "Server Error" }));

    const response = await run(fetchMock);

    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Values fetch failed");
  });

  it("defaults to an empty array when the sheet has no values", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(TOKEN_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(METADATA_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({}));

    const response = await run(fetchMock);

    expect(await response.clone().json()).toEqual({ values: [] });
  });
});
