import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { ResolvedItem } from "../lib/time";
import { formatTime } from "../lib/time";
import { googleMapsUrl, uberUrl } from "../lib/links";
import { TravelEstimate } from "./TravelEstimate";

interface Props {
  item: ResolvedItem;
  timeState: "past" | "current" | "future";
  region?: string;
  /** Trip's own IANA time zone; item times are shown in this zone. */
  timeZone: string;
  /** When true, also shows the device's own local-equivalent start time. */
  showDeviceTime?: boolean;
  /** The day's following item, if any, used for the walk/drive estimate. */
  nextItem?: ResolvedItem;
}

const CATEGORY_CLASS: Record<string, string> = {
  Transport: "cat-transport",
  Accommodation: "cat-accommodation",
  Dining: "cat-dining",
  Excursion: "cat-excursion",
};

export function ItineraryCard({ item, timeState, region, timeZone, showDeviceTime, nextItem }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const maps = googleMapsUrl(item, region);
  const uber = uberUrl(item, region);
  const catClass = CATEGORY_CLASS[item.category] ?? "cat-other";
  const hasDetail = Boolean(item.notes || item.address || item.confirmationNumber);

  // Only ever wired up to a button that's rendered exclusively inside the
  // `item.confirmationNumber &&` block below, so the value is always set here.
  async function copyConfirmation(e: MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.confirmationNumber!);
    setCopied(true);
  }

  return (
    <li className={`item-card ${timeState} ${catClass}`}>
      <div className="item-time">
        <span>{formatTime(item.start, timeZone)}</span>
        <span className="item-time-sep">–</span>
        <span>{formatTime(item.end, timeZone)}</span>
        {showDeviceTime && <span className="item-time-device">{formatTime(item.start)} local</span>}
      </div>
      <div className="item-body">
        {hasDetail ? (
          <button
            type="button"
            className="item-heading expandable"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span className="item-activity">{item.activity}</span>
            <span className="item-heading-right">
              <span className="item-category-badge">{item.category}</span>
              <span className="item-expand-chevron" aria-hidden="true">
                {expanded ? "▴" : "▾"}
              </span>
            </span>
          </button>
        ) : (
          <div className="item-heading">
            <span className="item-activity">{item.activity}</span>
            <span className="item-category-badge">{item.category}</span>
          </div>
        )}

        {item.locationName && <div className="item-location">{item.locationName}</div>}

        {expanded && (
          <div className="item-detail">
            {item.address && (
              <div className="item-detail-row">
                <span className="item-detail-label">Address</span> {item.address}
              </div>
            )}
            {item.notes && <div className="item-notes">{item.notes}</div>}
            {item.confirmationNumber && (
              <div className="item-confirmation">
                <span>
                  <span className="item-detail-label">Confirmation</span> {item.confirmationNumber}
                </span>
                <button type="button" className="copy-btn" onClick={copyConfirmation}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}

        {(maps || uber) && (
          <div className="item-actions">
            {maps && (
              <a className="action-btn maps" href={maps} target="_blank" rel="noreferrer">
                Maps
              </a>
            )}
            {uber && (
              <a className="action-btn uber" href={uber} target="_blank" rel="noreferrer">
                Uber
              </a>
            )}
          </div>
        )}

        {nextItem && <TravelEstimate from={item} to={nextItem} region={region} />}
      </div>
    </li>
  );
}
