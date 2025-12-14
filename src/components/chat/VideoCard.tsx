/**
 * VideoCard Component
 *
 * Displays AI-generated videos in chat with:
 * - Video player with controls
 * - Loading state while video generates
 * - Download button
 * - Video info (prompt, duration)
 */

'use client';

import { useState, useRef } from 'react';

interface VideoCardProps {
  videoUrl: string;
  prompt: string;
  duration?: number;
  aspectRatio?: string;
}

export default function VideoCard({ videoUrl, prompt, duration = 5, aspectRatio = '16:9' }: VideoCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = async () => {
    try {
      // Use proxy to bypass CORS
      const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bakame-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(videoUrl, '_blank');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Calculate aspect ratio class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[280px]';
      case '1:1':
        return 'aspect-square max-w-[400px]';
      default:
        return 'aspect-video max-w-[500px]';
    }
  };

  if (hasError) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 max-w-md">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Video failed to load</span>
        </div>
        <p className="text-sm text-red-500 dark:text-red-300 mt-1">Please try generating again.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 ${getAspectClass()}`}>
      {/* Video Container */}
      <div className="relative w-full h-full">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 z-10">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🎬</span>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 font-medium">Loading video...</p>
          </div>
        )}

        {/* Video Player */}
        <video
          ref={videoRef}
          src={videoUrl}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoadedData={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls
          playsInline
          loop
        />

        {/* Play/Pause Overlay (shows when paused) */}
        {!isLoading && !isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-16 h-16 flex items-center justify-center bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors">
              <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="p-3 bg-white dark:bg-white/5">
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={prompt}>
          {prompt.length > 80 ? `${prompt.substring(0, 80)}...` : prompt}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {duration}s
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {aspectRatio}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              title="Download video"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              AI Video
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
