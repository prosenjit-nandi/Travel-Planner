import { useEffect, useState } from "react";
import { photoForQuery } from "../lib/photo";

interface Props {
  query: string;
  className: string;
}

/** A small photo for a place name, via Wikipedia search. Renders nothing on
 * a miss or a broken image — reused for both the trip overview's per-city
 * hero banner and its per-day place gallery. */
export function Thumbnail({ query, className }: Props) {
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

  return <img className={className} src={photoUrl} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
