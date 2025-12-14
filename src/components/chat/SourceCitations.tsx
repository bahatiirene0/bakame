/**
 * Source Citations Component
 *
 * Perplexity-style collapsible source citations panel.
 * Shows sources used in web search results with:
 * - Expandable panel
 * - Numbered references
 * - Favicon + title
 * - Click to open source
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Source {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

interface SourceCitationsProps {
  sources: Source[];
  className?: string;
}

// Get favicon URL from a website URL
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

// Get domain name from URL
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function SourceCitations({ sources, className = '' }: SourceCitationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`my-4 ${className}`}>
      {/* Header - always visible */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
          bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20
          border border-blue-200 dark:border-blue-500/30
          transition-colors duration-200"
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Used {sources.length} source{sources.length !== 1 ? 's' : ''}
          </span>
        </div>

        <motion.svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Expanded sources list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 px-1">
              {sources.map((source, index) => (
                <motion.a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl
                    bg-white dark:bg-gray-800/50
                    border border-gray-200 dark:border-gray-700
                    hover:border-blue-300 dark:hover:border-blue-500/50
                    hover:shadow-md dark:hover:shadow-blue-500/5
                    transition-all duration-200 group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Number badge */}
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                    rounded-full bg-gray-100 dark:bg-gray-700
                    text-xs font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </span>

                  {/* Favicon */}
                  <img
                    src={getFaviconUrl(source.url)}
                    alt=""
                    className="w-5 h-5 rounded mt-0.5 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white
                        group-hover:text-blue-600 dark:group-hover:text-blue-400
                        transition-colors truncate">
                        {source.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getDomain(source.url)}
                      {source.date && ` · ${source.date}`}
                    </span>
                    {source.snippet && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500
                      transition-colors flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline citation reference [1] style
 */
export function CitationRef({ number, url }: { number: number; url?: string }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-5 h-5 ml-0.5
          text-[10px] font-semibold text-blue-600 dark:text-blue-400
          bg-blue-100 dark:bg-blue-500/20 rounded
          hover:bg-blue-200 dark:hover:bg-blue-500/30
          transition-colors cursor-pointer align-super"
      >
        {number}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 ml-0.5
      text-[10px] font-semibold text-blue-600 dark:text-blue-400
      bg-blue-100 dark:bg-blue-500/20 rounded align-super">
      {number}
    </span>
  );
}
