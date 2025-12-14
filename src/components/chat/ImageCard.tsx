/**
 * ImageCard Component
 *
 * Displays AI-generated images in chat with:
 * - Loading state while image generates
 * - Click to view full size
 * - Download button
 * - Image info (prompt used)
 */

'use client';

import { useState } from 'react';

interface ImageCardProps {
  imageUrl: string;
  prompt: string;
  width?: number;
  height?: number;
}

export default function ImageCard({ imageUrl, prompt, width = 1024, height = 1024 }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = async () => {
    try {
      // Use proxy to bypass CORS for DALL-E images
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bakame-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  if (hasError) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 max-w-md">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Image failed to load</span>
        </div>
        <p className="text-sm text-red-500 dark:text-red-300 mt-1">Please try generating again.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 max-w-md">
        {/* Image Container */}
        <div className="relative aspect-square">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-500/20 to-yellow-500/20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-2xl">🎨</span>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Creating your image...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Actual Image */}
          <img
            src={imageUrl}
            alt={prompt}
            className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            onClick={() => setIsExpanded(true)}
          />

          {/* Hover Overlay */}
          {!isLoading && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-2 bg-white/90 rounded-full text-gray-800 hover:bg-white transition-colors"
                  title="View full size"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/90 rounded-full text-gray-800 hover:bg-white transition-colors"
                  title="Download image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Bar */}
        <div className="p-3 bg-white dark:bg-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={prompt}>
            {prompt.length > 100 ? `${prompt.substring(0, 100)}...` : prompt}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {width}×{height}
            </span>
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              AI Generated
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsExpanded(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Download Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="absolute top-4 left-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          {/* Full Size Image */}
          <img
            src={imageUrl}
            alt={prompt}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
