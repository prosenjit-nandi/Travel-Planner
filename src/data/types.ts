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
  /**
   * Optional city, appended to the Maps/Uber query (when falling back to
   * locationName) to disambiguate generic or chain-like names from a
   * same-named place elsewhere, e.g. "Waterloo Station" exists in both
   * London and Ontario. Ignored when a precise address is set.
   */
  city?: string;
  category: Category;
  notes?: string;
  /** Booking/confirmation reference, e.g. a flight PNR or hotel reservation number. */
  confirmationNumber?: string;
}

export interface Trip {
  id: string;
  title: string;
  /** IANA timezone the trip takes place in, e.g. "Europe/London" */
  timezone: string;
  /**
   * Country/region appended to the Maps/Uber query (when falling back to
   * locationName) so common venue names don't resolve to a same-named place
   * in another country, e.g. "United Kingdom".
   */
  region?: string;
  items: ItineraryItem[];
}

export interface ItineraryDataSource {
  load(): Promise<Trip>;
}
