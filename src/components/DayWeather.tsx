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

  const hasExtra =
    forecast.sunrise !== undefined &&
    forecast.sunset !== undefined &&
    forecast.windSpeedMax !== undefined &&
    forecast.precipitationProbabilityMax !== undefined &&
    forecast.sunnyPercentage !== undefined &&
    forecast.cloudyPercentage !== undefined &&
    forecast.rainTimeOfDay !== undefined;

  if (!hasExtra) {
    const minF = Math.round(forecast.minC * 9 / 5 + 32);
    const maxF = Math.round(forecast.maxC * 9 / 5 + 32);
    return (
      <div className="day-weather">
        {weatherLabel(forecast.code)} · {Math.round(forecast.minC)}–{Math.round(forecast.maxC)}°C ({minF}–{maxF}°F)
      </div>
    );
  }

  const getWeatherEmoji = (code: number) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 57) return "🌦️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌧️";
    if (code <= 86) return "❄️";
    return "⛈️";
  };

  const emoji = getWeatherEmoji(forecast.code);
  const label = weatherLabel(forecast.code);
  const maxF = Math.round(forecast.maxC * 9 / 5 + 32);
  const minF = Math.round(forecast.minC * 9 / 5 + 32);

  return (
    <div className={`day-weather-card weather-code-${forecast.code}`}>
      <div className="weather-card-header">
        <div className="weather-card-main">
          <span className="weather-emoji">{emoji}</span>
          <div>
            <h3 className="weather-city">{city}</h3>
            <p className="weather-desc">{label}</p>
          </div>
        </div>
        <div className="weather-temp-range">
          <span className="weather-temp-max">{Math.round(forecast.maxC)}°C ({maxF}°F)</span>
          <span className="weather-temp-divider">/</span>
          <span className="weather-temp-min">{Math.round(forecast.minC)}°C ({minF}°F)</span>
        </div>
      </div>


      <div className="weather-card-grid">
        <div className="weather-grid-item">
          <span className="weather-item-icon">🌅</span>
          <div className="weather-item-details">
            <span className="weather-item-label">Sunrise</span>
            <span className="weather-item-value">{forecast.sunrise}</span>
          </div>
        </div>

        <div className="weather-grid-item">
          <span className="weather-item-icon">🌇</span>
          <div className="weather-item-details">
            <span className="weather-item-label">Sunset</span>
            <span className="weather-item-value">{forecast.sunset}</span>
          </div>
        </div>

        <div className="weather-grid-item">
          <span className="weather-item-icon">💨</span>
          <div className="weather-item-details">
            <span className="weather-item-label">Wind Speed</span>
            <span className="weather-item-value">{Math.round(forecast.windSpeedMax!)} km/h</span>
          </div>
        </div>

        <div className="weather-grid-item">
          <span className="weather-item-icon">💧</span>
          <div className="weather-item-details">
            <span className="weather-item-label">Rain Chance</span>
            <span className="weather-item-value">{forecast.precipitationProbabilityMax}%</span>
          </div>
        </div>
      </div>

      <div className="weather-card-footer">
        <div className="weather-sky-status">
          <div className="weather-sky-bars">
            <div className="weather-sky-label">
              <span>Sunny: {forecast.sunnyPercentage}%</span>
              <span>Cloudy: {forecast.cloudyPercentage}%</span>
            </div>
            <div className="weather-progress-bg">
              <div
                className="weather-progress-bar sunny"
                style={{ width: `${forecast.sunnyPercentage}%` }}
              />
              <div
                className="weather-progress-bar cloudy"
                style={{ width: `${forecast.cloudyPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="weather-rain-schedule">
          <span className="weather-rain-icon">🌧️</span>
          <div className="weather-rain-details">
            <span className="weather-rain-label">Rain Schedule</span>
            <span className="weather-rain-value">{forecast.rainTimeOfDay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
