export type Category =
  | "Transport"
  | "Accommodation"
  | "Dining"
  | "Excursion"
  | string;

export interface ItineraryItem {
  id: string;
  /** ISO date, e.g. "2026-07-24" */
  date: string;
  /** 24h "HH:mm", local to wherever the trip is happening */
  startTime: string;
  /** 24h "HH:mm". If earlier than startTime, the activity runs past midnight. */
  endTime: string;
  activity: string;
  /** Display name used as the map/rideshare query when no precise address is set */
  locationName: string;
  /** Precise address, used instead of locationName for maps/Uber when present */
  address?: string;
  category: Category;
  notes?: string;
}

export interface Trip {
  id: string;
  title: string;
  /** IANA timezone the trip takes place in, e.g. "Europe/London" */
  timezone: string;
  items: ItineraryItem[];
}

export interface ItineraryDataSource {
  load(): Promise<Trip>;
}
