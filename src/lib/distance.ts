import type { GeoPoint } from "./geocode";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export type TravelMode = "walk" | "drive";

export interface TravelEstimate {
  mode: TravelMode;
  minutes: number;
}

const ROUTE_INDIRECTNESS_FACTOR = 1.3;
const WALK_THRESHOLD_KM = 1.5;
const WALK_KMH = 4.8;
const DRIVE_KMH = 24;

/**
 * Rough travel-time estimate from straight-line distance — not real
 * routing, just enough to gauge whether the next item is a walk or a ride.
 * Applies an indirectness factor since real streets are never perfectly
 * straight, and switches to "drive" past a walkable distance, matching how
 * a traveler would actually choose to cover the ground.
 */
export function estimateTravel(distanceKm: number): TravelEstimate {
  const routeKm = distanceKm * ROUTE_INDIRECTNESS_FACTOR;
  if (distanceKm <= WALK_THRESHOLD_KM) {
    return { mode: "walk", minutes: (routeKm / WALK_KMH) * 60 };
  }
  return { mode: "drive", minutes: (routeKm / DRIVE_KMH) * 60 };
}
