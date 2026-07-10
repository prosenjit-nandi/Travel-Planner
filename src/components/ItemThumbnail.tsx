import { useEffect, useState } from "react";
import type { ItineraryItem } from "../data/types";
import { photoFor } from "../lib/photo";

interface Props {
  item: ItineraryItem;
}

export function ItemThumbnail({ item }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    setFailed(false);
    photoFor(item).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!photoUrl || failed) return null;

  // Decorative — the activity/location text alongside it already conveys
  // the same information to assistive tech.
  return (
    <img className="item-thumbnail" src={photoUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}
