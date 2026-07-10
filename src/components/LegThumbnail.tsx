import { useEffect, useState } from "react";
import { photoForQuery } from "../lib/photo";

export function LegThumbnail({ query }: { query: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    setFailed(false);
    photoForQuery(query).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!photoUrl || failed) return null;

  return (
    <img
      className="trip-overview-thumbnail"
      src={photoUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
