import { useEffect, useState } from "react";
import type { ItineraryItem } from "../data/types";
import type { TravelEstimate as TravelEstimateResult } from "../lib/distance";
import { estimateTimeToNext } from "../lib/travelEstimate";
import { formatMinutes } from "../lib/time";

interface Props {
  from: ItineraryItem;
  to: ItineraryItem;
  region?: string;
}

const MODE_LABEL: Record<TravelEstimateResult["mode"], string> = {
  walk: "walk",
  drive: "drive",
};

export function TravelEstimate({ from, to, region }: Props) {
  const [estimate, setEstimate] = useState<TravelEstimateResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEstimate(null);
    estimateTimeToNext(from, to, region).then((result) => {
      if (!cancelled) setEstimate(result);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, region]);

  if (!estimate) return null;

  return (
    <div
      className="item-travel-estimate"
      title="Estimated from straight-line distance, not live traffic or routing"
    >
      ~{formatMinutes(estimate.minutes)} {MODE_LABEL[estimate.mode]} to next
    </div>
  );
}
