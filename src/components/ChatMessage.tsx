/**
 * ChatMessage Component - Premium Design
 *
 * Features:
 * - Premium gradient user bubbles with glow
 * - AI messages with avatar hover effects
 * - Smooth letter-by-letter streaming animation
 * - Enhanced markdown with syntax highlighting
 * - Tool-specific loading indicators
 * - Rich content cards (directions, weather, sources)
 * - File attachments (images, documents)
 * - Edit and regenerate for user messages
 */

'use client';

import { useState } from 'react';
import { Message } from '@/types';
import {
  MessageRenderer,
  StreamingRenderer,
  ToolLoadingIndicator,
  SourceCitations,
  DirectionsCard,
  WeatherCard,
  MessageAttachments,
  ImageCard,
  VideoCard,
  CodeOutputCard,
} from './chat';
import { useChatStore } from '@/store/chatStore';
import { useTranslation } from '@/store/languageStore';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const t = useTranslation();
  const { editMessageAndRegenerate, isStreaming: storeIsStreaming } = useChatStore();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEditSave = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await editMessageAndRegenerate(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  if (isUser) {
    // User message - right aligned with premium gradient bubble
    return (
      <div className="flex w-full justify-end animate-fadeIn">
        <div className="group max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
          {/* Attachments above the message bubble */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex justify-end">
              <MessageAttachments attachments={message.attachments} />
            </div>
          )}

          {/* Edit mode */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[80px] px-4 py-3 rounded-2xl
                  bg-white dark:bg-gray-800
                  border-2 border-green-500
                  text-gray-900 dark:text-white
                  text-[14px] leading-relaxed
                  resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1.5 text-sm rounded-lg
                    bg-gray-200 dark:bg-gray-700
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-300 dark:hover:bg-gray-600
                    transition-colors"
                >
                  {t.cancelEdit}
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editContent.trim() || editContent === message.content}
                  className="px-3 py-1.5 text-sm rounded-lg
                    bg-green-500 text-white
                    hover:bg-green-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors"
                >
                  {t.saveEdit}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Message bubble - only show if there's content */}
              {message.content && (
                <div className="relative">
                  <div className="px-4 py-3 rounded-2xl rounded-br-md
                    bg-gradient-to-r from-green-600 via-green-500 to-emerald-500
                    text-white shadow-lg shadow-green-500/25
                    hover:shadow-xl hover:shadow-green-500/30
                    transition-all duration-300">
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {message.content}
                    </p>
                  </div>
                  {/* Edit button - appears on hover */}
                  {!storeIsStreaming && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute -left-10 top-1/2 -translate-y-1/2
                        p-2 rounded-lg opacity-0 group-hover:opacity-100
                        bg-gray-200 dark:bg-gray-700
                        text-gray-600 dark:text-gray-400
                        hover:bg-gray-300 dark:hover:bg-gray-600
                        transition-all duration-200"
                      title={t.editMessage}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // AI message - left aligned with premium styling
  return (
    <div className="flex w-full justify-start animate-fadeIn">
      <div className="flex gap-3.5 max-w-full group">
        {/* Avatar with hover effect */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
            flex items-center justify-center
            shadow-lg shadow-green-500/20
            group-hover:shadow-green-500/40 group-hover:scale-105
            transition-all duration-300">
            <span className="text-xs sm:text-sm">🐰</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Tool loading indicator */}
          {message.toolName && isStreaming && !message.content && (
            <ToolLoadingIndicator toolName={message.toolName} />
          )}

          {/* Source citations for web search */}
          {message.sources && message.sources.length > 0 && (
            <SourceCitations sources={message.sources} />
          )}

          {/* Directions card */}
          {message.directionsData && (
            <DirectionsCard data={message.directionsData} />
          )}

          {/* Weather card */}
          {message.weatherData && (
            <WeatherCard data={message.weatherData} />
          )}

          {/* Generated image */}
          {message.generatedImage && (
            <div className="mb-3">
              <ImageCard
                imageUrl={message.generatedImage.url}
                prompt={message.generatedImage.prompt}
                width={message.generatedImage.width}
                height={message.generatedImage.height}
              />
            </div>
          )}

          {/* Generated video */}
          {message.generatedVideo && (
            <div className="mb-3">
              <VideoCard
                videoUrl={message.generatedVideo.url}
                prompt={message.generatedVideo.prompt}
                duration={message.generatedVideo.duration}
                aspectRatio={message.generatedVideo.aspectRatio}
              />
            </div>
          )}

          {/* Code execution output */}
          {message.codeOutput && (
            <div className="mb-3">
              <CodeOutputCard
                code={message.codeOutput.code}
                language={message.codeOutput.language}
                version={message.codeOutput.version}
                output={message.codeOutput.output}
                error={message.codeOutput.error}
                exitCode={message.codeOutput.exitCode}
              />
            </div>
          )}

          {/* Main content */}
          {message.content ? (
            isStreaming ? (
              // Smooth streaming reveal with markdown
              <StreamingRenderer
                content={message.content}
                isStreaming={isStreaming}
              />
            ) : (
              // Completed message - full markdown
              <MessageRenderer content={message.content} />
            )
          ) : !message.toolName ? (
            // Empty state with cursor (only if not showing tool indicator)
            <div className="flex items-center h-6">
              <span className="inline-block w-2 h-4 bg-green-500 dark:bg-green-400 animate-pulse rounded-sm" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
