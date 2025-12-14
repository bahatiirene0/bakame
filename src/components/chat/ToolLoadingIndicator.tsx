/**
 * Tool Loading Indicator Component
 *
 * Shows contextual, animated loading states based on which tool is being used.
 * Inspired by ChatGPT, Claude, and Perplexity loading patterns.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToolType =
  | 'web_search'
  | 'maps'
  | 'weather'
  | 'calculator'
  | 'translation'
  | 'news'
  | 'currency'
  | 'time'
  | 'places'
  | 'tax'
  | 'gov_services'
  | 'image_generation'
  | 'video_generation'
  | 'thinking'
  | 'default';

interface ToolConfig {
  icon: string;
  messages: string[];
  color: string;
  bgColor: string;
}

const toolConfigs: Record<ToolType, ToolConfig> = {
  web_search: {
    icon: '🔍',
    messages: [
      'Searching the web...',
      'Finding sources...',
      'Gathering information...',
      'Analyzing results...',
    ],
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  maps: {
    icon: '🗺️',
    messages: [
      'Finding your route...',
      'Calculating distance...',
      'Getting directions...',
      'Mapping the journey...',
    ],
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  weather: {
    icon: '🌤️',
    messages: [
      'Checking the weather...',
      'Getting forecast...',
      'Analyzing conditions...',
    ],
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  calculator: {
    icon: '🔢',
    messages: [
      'Calculating...',
      'Crunching numbers...',
      'Computing result...',
    ],
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  translation: {
    icon: '🌐',
    messages: [
      'Translating...',
      'Converting languages...',
      'Processing translation...',
    ],
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  news: {
    icon: '📰',
    messages: [
      'Fetching latest news...',
      'Getting headlines...',
      'Finding articles...',
    ],
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  currency: {
    icon: '💱',
    messages: [
      'Converting currency...',
      'Getting exchange rates...',
      'Calculating conversion...',
    ],
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  time: {
    icon: '🕐',
    messages: [
      'Getting current time...',
      'Checking timezone...',
    ],
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  places: {
    icon: '📍',
    messages: [
      'Searching places...',
      'Finding locations...',
      'Getting details...',
    ],
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  tax: {
    icon: '🏛️',
    messages: [
      'Looking up tax info...',
      'Checking RRA database...',
      'Finding tax details...',
    ],
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  gov_services: {
    icon: '🏢',
    messages: [
      'Checking Irembo services...',
      'Finding government info...',
      'Getting service details...',
    ],
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  image_generation: {
    icon: '🎨',
    messages: [
      'Creating your image...',
      'Painting with AI...',
      'Generating artwork...',
      'Almost ready...',
    ],
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  video_generation: {
    icon: '🎬',
    messages: [
      'Creating your video...',
      'Rendering scenes...',
      'Adding motion...',
      'Finalizing video...',
      'Almost ready...',
    ],
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  thinking: {
    icon: '✨',
    messages: [
      'Thinking...',
      'Contemplating...',
      'Processing...',
      'Reasoning...',
    ],
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  default: {
    icon: '⚡',
    messages: [
      'Working on it...',
      'Processing request...',
      'Almost there...',
    ],
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
};

interface ToolLoadingIndicatorProps {
  toolType?: ToolType;
  toolName?: string; // Raw tool name from API
}

// Map API tool names to our tool types
function getToolType(toolName?: string): ToolType {
  if (!toolName) return 'thinking';

  const mapping: Record<string, ToolType> = {
    'search_web': 'web_search',
    'get_location_and_directions': 'maps',
    'get_weather': 'weather',
    'calculate': 'calculator',
    'translate_text': 'translation',
    'get_news': 'news',
    'convert_currency': 'currency',
    'get_current_time': 'time',
    'search_places': 'places',
    'get_rwanda_tax_info': 'tax',
    'get_gov_services_info': 'gov_services',
    'generate_image': 'image_generation',
    'generate_video': 'video_generation',
  };

  return mapping[toolName] || 'default';
}

export default function ToolLoadingIndicator({ toolType, toolName }: ToolLoadingIndicatorProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const type = toolType || getToolType(toolName);
  const config = toolConfigs[type];

  // Rotate through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % config.messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [config.messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}
    >
      {/* Animated Icon */}
      <motion.span
        className="text-sm"
        animate={{
          rotate: type === 'web_search' ? [0, 360] : 0,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {config.icon}
      </motion.span>

      {/* Message with dots inline */}
      <div className="flex items-center gap-1">
        <AnimatePresence mode="wait">
          <motion.span
            key={messageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-xs ${config.color}`}
          >
            {config.messages[messageIndex]}
          </motion.span>
        </AnimatePresence>

        {/* Slim animated dots */}
        <div className="flex gap-0.5 ml-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`w-1 h-1 rounded-full ${config.color.replace('text-', 'bg-')}`}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact version for inline use
 */
export function ToolLoadingInline({ toolName }: { toolName?: string }) {
  const type = getToolType(toolName);
  const config = toolConfigs[type];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % config.messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [config.messages.length]);

  return (
    <span className={`inline-flex items-center gap-1.5 ${config.color}`}>
      <motion.span
        className="text-xs"
        animate={{ rotate: type === 'web_search' ? [0, 360] : 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        {config.icon}
      </motion.span>
      <motion.span
        key={messageIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs"
      >
        {config.messages[messageIndex]}
      </motion.span>
    </span>
  );
}
