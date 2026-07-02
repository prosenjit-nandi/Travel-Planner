import type { ResolvedItem } from "../lib/time";
import { formatTime } from "../lib/time";
import { googleMapsUrl, uberUrl } from "../lib/links";

interface Props {
  item: ResolvedItem;
  timeState: "past" | "current" | "future";
}

const CATEGORY_CLASS: Record<string, string> = {
  Transport: "cat-transport",
  Accommodation: "cat-accommodation",
  Dining: "cat-dining",
  Excursion: "cat-excursion",
};

export function ItineraryCard({ item, timeState }: Props) {
  const maps = googleMapsUrl(item);
  const uber = uberUrl(item);
  const catClass = CATEGORY_CLASS[item.category] ?? "cat-other";

  return (
    <li className={`item-card ${timeState} ${catClass}`}>
      <div className="item-time">
        <span>{formatTime(item.start)}</span>
        <span className="item-time-sep">–</span>
        <span>{formatTime(item.end)}</span>
      </div>
      <div className="item-body">
        <div className="item-heading">
          <span className="item-activity">{item.activity}</span>
          <span className="item-category-badge">{item.category}</span>
        </div>
        {item.locationName && <div className="item-location">{item.locationName}</div>}
        {item.notes && <div className="item-notes">{item.notes}</div>}
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
      </div>
    </li>
  );
}
