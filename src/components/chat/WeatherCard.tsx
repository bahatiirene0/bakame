/**
 * Weather Card Component
 *
 * Beautiful card for displaying weather information
 * with temperature, conditions, and forecast.
 */

'use client';

import { motion } from 'framer-motion';

interface WeatherData {
  location: string;
  temperature: number;
  unit?: 'C' | 'F';
  condition: string;
  humidity?: number;
  wind_speed?: string;
  feels_like?: number;
  high?: number;
  low?: number;
  icon?: string;
}

interface WeatherCardProps {
  data: WeatherData;
  className?: string;
}

// Map weather conditions to emojis
const weatherIcons: Record<string, string> = {
  sunny: '☀️',
  clear: '☀️',
  'partly cloudy': '⛅',
  cloudy: '☁️',
  overcast: '☁️',
  rain: '🌧️',
  'light rain': '🌦️',
  'heavy rain': '🌧️',
  thunderstorm: '⛈️',
  snow: '❄️',
  fog: '🌫️',
  mist: '🌫️',
  haze: '🌫️',
  wind: '💨',
  hot: '🌡️',
  cold: '🥶',
};

function getWeatherIcon(condition: string): string {
  const lower = condition.toLowerCase();
  for (const [key, icon] of Object.entries(weatherIcons)) {
    if (lower.includes(key)) return icon;
  }
  return '🌤️'; // default
}

export default function WeatherCard({ data, className = '' }: WeatherCardProps) {
  const icon = data.icon || getWeatherIcon(data.condition);
  const unit = data.unit || 'C';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700
        bg-gradient-to-br from-sky-400 to-blue-500 dark:from-sky-600 dark:to-blue-700
        text-white shadow-lg ${className}`}
    >
      {/* Main content */}
      <div className="p-5">
        {/* Location */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📍</span>
          <span className="font-medium text-white/90">{data.location}</span>
        </div>

        {/* Temperature and condition */}
        <div className="flex items-center justify-between">
          <div>
            <motion.span
              className="text-6xl font-light"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              {Math.round(data.temperature)}°{unit}
            </motion.span>
            <p className="text-lg text-white/80 mt-1 capitalize">{data.condition}</p>
          </div>
          <motion.span
            className="text-6xl"
            animate={{
              y: [0, -5, 0],
              rotate: data.condition.toLowerCase().includes('wind') ? [0, 10, -10, 0] : 0,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {icon}
          </motion.span>
        </div>

        {/* High/Low */}
        {(data.high !== undefined || data.low !== undefined) && (
          <div className="flex gap-4 mt-4 text-sm text-white/80">
            {data.high !== undefined && (
              <span>↑ {Math.round(data.high)}°</span>
            )}
            {data.low !== undefined && (
              <span>↓ {Math.round(data.low)}°</span>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="px-5 py-3 bg-black/10 flex items-center gap-6 text-sm">
        {data.feels_like !== undefined && (
          <div className="flex items-center gap-2">
            <span>🌡️</span>
            <span className="text-white/80">Feels like {Math.round(data.feels_like)}°</span>
          </div>
        )}
        {data.humidity !== undefined && (
          <div className="flex items-center gap-2">
            <span>💧</span>
            <span className="text-white/80">{data.humidity}%</span>
          </div>
        )}
        {data.wind_speed && (
          <div className="flex items-center gap-2">
            <span>💨</span>
            <span className="text-white/80">{data.wind_speed}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
