import { useEffect, useMemo, useState } from "react";
import { activeDataSource } from "./data/activeTrip";
import type { Trip } from "./data/types";
import { resolveDayItems, todayISO, nearestTripDate } from "./lib/time";
import { getDayStatus } from "./lib/schedule";
import { StatusBanner } from "./components/StatusBanner";
import { DayNav } from "./components/DayNav";
import { ItineraryCard } from "./components/ItineraryCard";
import "./App.css";

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

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
      setSelectedDate(nearestTripDate(tripDates, todayISO()));
    }
  }, [trip, tripDates, selectedDate]);

  const dayItems = useMemo(() => {
    if (!trip || !selectedDate) return [];
    const items = trip.items.filter((i) => i.date === selectedDate);
    return resolveDayItems(selectedDate, items);
  }, [trip, selectedDate]);

  if (!trip || !selectedDate) {
    return <div className="app-loading">Loading itinerary…</div>;
  }

  const status = getDayStatus(dayItems, now);
  const isToday = selectedDate === todayISO(now);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{trip.title}</h1>
      </header>

      <DayNav date={selectedDate} dates={tripDates} onChange={setSelectedDate} />

      {isToday && <StatusBanner status={status} />}

      <ul className="item-list">
        {dayItems.map((item) => {
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
              timeState={isToday ? timeState : "future"}
            />
          );
        })}
      </ul>
    </div>
  );
}
