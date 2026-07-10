import { useEffect, useState } from "react";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";

interface Props {
  city: string;
  date: string;
}

export function DayWeather({ city, date }: Props) {
  const [forecast, setForecast] = useState<DayForecast | null>(null);

  useEffect(() => {
    let cancelled = false;
    setForecast(null);
    forecastFor(city, date).then((result) => {
      if (!cancelled) setForecast(result);
    });
    return () => {
      cancelled = true;
    };
  }, [city, date]);

  if (!forecast) return null;

  return (
    <div className="day-weather">
      {weatherLabel(forecast.code)} · {Math.round(forecast.minC)}–{Math.round(forecast.maxC)}°C
    </div>
  );
}
