import { useEffect, useMemo, useState } from "react";
import { activeDataSource } from "./data/activeTrip";
import type { Trip } from "./data/types";
import { resolveDayItems, todayISO, defaultTripDate } from "./lib/time";
import { getDayStatus } from "./lib/schedule";
import { cityForDay } from "./lib/weather";
import { baseLocation } from "./lib/links";
import { groupTripLegs, type DaySummary } from "./lib/tripOverview";
import { StatusBanner } from "./components/StatusBanner";
import { DayNav } from "./components/DayNav";
import { DayWeather } from "./components/DayWeather";
import { ItineraryCard } from "./components/ItineraryCard";
import { TripOverview } from "./components/TripOverview";
import "./App.css";

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<"day" | "overview">("day");

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      activeDataSource.load().then((t) => {
        if (!cancelled) setTrip(t);
      });
    };
    refresh();
    const id = setInterval(refresh, 10 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const tripDates = useMemo(() => {
    if (!trip) return [];
    return [...new Set(trip.items.map((i) => i.date))].sort();
  }, [trip]);

  useEffect(() => {
    if (trip && selectedDate === null) {
      setSelectedDate(defaultTripDate(tripDates, todayISO(new Date(), trip.timezone)));
    }
  }, [trip, tripDates, selectedDate]);

  const dayItems = useMemo(() => {
    if (!trip || !selectedDate) return [];
    const items = trip.items.filter((i) => i.date === selectedDate);
    return resolveDayItems(selectedDate, items, trip.timezone);
  }, [trip, selectedDate]);

  const tripLegs = useMemo(() => {
    if (!trip) return [];
    const daySummaries: DaySummary[] = tripDates.map((date) => {
      const items = trip.items.filter((i) => i.date === date);
      const places = items
        .map((item) => baseLocation(item))
        .filter((place): place is string => Boolean(place));
      return { date, city: cityForDay(items), itemCount: items.length, places };
    });
    return groupTripLegs(daySummaries);
  }, [trip, tripDates]);

  if (!trip || !selectedDate) {
    return <div className="app-loading">Loading itinerary…</div>;
  }

  const status = getDayStatus(dayItems, now);
  const todayDate = todayISO(now, trip.timezone);
  const isToday = selectedDate === todayDate;
  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const showDeviceTime = deviceTimeZone !== trip.timezone;
  const dayCity = cityForDay(dayItems);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{trip.title}</h1>
        <button
          type="button"
          className="overview-toggle"
          onClick={() => {
            if (view === "day") {
              setView("overview");
            } else {
              setSelectedDate(defaultTripDate(tripDates, todayDate));
              setView("day");
            }
          }}
        >
          {view === "day" ? "Trip overview" : "Back to day"}
        </button>
      </header>

      {view === "overview" ? (
        <TripOverview legs={tripLegs} totalDays={tripDates.length} fallbackLabel={trip.region} />
      ) : (
        <>
          <DayNav
            date={selectedDate}
            dates={tripDates}
            onChange={setSelectedDate}
            onJumpToday={
              tripDates.includes(todayDate) && !isToday ? () => setSelectedDate(todayDate) : undefined
            }
          />

          {dayCity && <DayWeather city={dayCity} date={selectedDate} />}

          {isToday && <StatusBanner status={status} timeZone={trip.timezone} showDeviceTime={showDeviceTime} />}

          <ul className="item-list">
            {dayItems.map((item, idx) => {
              const timeState =
                now.getTime() < item.start.getTime()
                  ? "future"
                  : now.getTime() > item.end.getTime()
                    ? "past"
                    : "current";
              return (
                <ItineraryCard
                  key={item.id}
                  item={item}
                  nextItem={dayItems[idx + 1]}
                  timeState={isToday ? timeState : "future"}
                  region={trip.region}
                  timeZone={trip.timezone}
                  showDeviceTime={showDeviceTime}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
