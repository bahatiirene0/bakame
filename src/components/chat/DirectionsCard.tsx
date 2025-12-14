/**
 * Directions Card Component
 *
 * Beautiful card for displaying directions/route information
 * with step-by-step instructions and action buttons.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DirectionStep {
  step: number;
  instruction: string;
  distance: string;
  duration: string;
  landmark?: string | null;
  area?: string | null;
}

interface DirectionsData {
  from: {
    name: string;
    full_name?: string;
  };
  to: {
    name: string;
    full_name?: string;
  };
  distance: string;
  duration: string;
  mode: string;
  steps: DirectionStep[];
  google_maps_url?: string;
  map_url?: string;
}

interface DirectionsCardProps {
  data: DirectionsData;
  className?: string;
}

const modeIcons: Record<string, string> = {
  driving: '🚗',
  walking: '🚶',
  cycling: '🚴',
};

const modeLabels: Record<string, string> = {
  driving: 'by car',
  walking: 'on foot',
  cycling: 'by bike',
};

export default function DirectionsCard({ data, className = '' }: DirectionsCardProps) {
  const [showAllSteps, setShowAllSteps] = useState(false);

  const displayedSteps = showAllSteps ? data.steps : data.steps.slice(0, 4);
  const hasMoreSteps = data.steps.length > 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800/50 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-semibold">Directions</span>
        </div>
      </div>

      {/* Route summary */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        {/* From/To */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200 dark:ring-green-500/30" />
            <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-500/30" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">From</p>
              <p className="font-medium text-gray-900 dark:text-white">{data.from.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
              <p className="font-medium text-gray-900 dark:text-white">{data.to.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <span>{modeIcons[data.mode] || '🚗'}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{data.distance}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
            <span>⏱️</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{data.duration}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {modeLabels[data.mode] || 'driving'}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
          Turn-by-turn directions
        </p>
        <div className="space-y-3">
          <AnimatePresence>
            {displayedSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                  rounded-full bg-green-100 dark:bg-green-500/20
                  text-xs font-semibold text-green-600 dark:text-green-400">
                  {step.step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {step.instruction}
                  </p>
                  {step.distance && step.distance !== '0 m' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.distance} · {step.duration}
                    </p>
                  )}
                  {step.landmark && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      📍 Near {step.landmark}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Show more/less */}
        {hasMoreSteps && (
          <button
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline
              flex items-center gap-1"
          >
            {showAllSteps ? (
              <>
                Show less
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show all {data.steps.length} steps
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700
        flex items-center gap-2">
        {data.google_maps_url && (
          <a
            href={data.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-green-500 hover:bg-green-600 text-white font-medium text-sm
              transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Open in Google Maps
          </a>
        )}
        {data.map_url && (
          <a
            href={data.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-300 font-medium text-sm
              transition-colors"
          >
            <span>🗺️</span>
            OSM
          </a>
        )}
      </div>
    </motion.div>
  );
}
