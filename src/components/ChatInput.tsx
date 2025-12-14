/**
 * ChatInput Component - Premium Design
 *
 * Features:
 * - Glassmorphism input container
 * - Gradient hover effects on buttons
 * - Smooth micro-interactions
 * - Animated send button with glow
 * - Guest mode: Large centered input (not fixed)
 * - Logged-in mode: Fixed bottom input
 * - File upload support (images, PDF, DOCX, XLSX)
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/languageStore';
import { useLocationStore } from '@/store/locationStore';
import { FileUploadButton, FilePreview, PendingFile } from '@/components/chat';
import { validateFile } from '@/lib/files';
import { FileAttachment, FILE_LIMITS } from '@/types';

interface ChatInputProps {
  isGuest?: boolean;
}

export default function ChatInput({ isGuest = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, isStreaming, sidebarOpen, cancelRequest, sessions, activeSessionId, clearMessages, createSession, canCreateNewSession } = useChatStore();
  const { user } = useAuthStore();
  const t = useTranslation();
  const { latitude, longitude, permissionStatus, isLoading: locationLoading, requestLocation } = useLocationStore();
  const hasLocation = latitude !== null && longitude !== null;

  // Handle new chat creation
  const handleNewChat = () => {
    if (canCreateNewSession() && !isStreaming) {
      createSession();
    }
  };

  // Handle clear with confirmation
  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    clearMessages();
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  // File upload handlers
  const handleFilesSelected = useCallback((files: File[]) => {
    // Check if user is logged in (required for uploads)
    if (!user) {
      // Could show a toast here - for now just skip
      return;
    }

    // Validate and add files
    const newPendingFiles: PendingFile[] = [];
    const currentCount = pendingFiles.length;

    for (const file of files) {
      // Check max files limit
      if (currentCount + newPendingFiles.length >= FILE_LIMITS.maxFiles) {
        break;
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        // Add with error state
        newPendingFiles.push({
          id: crypto.randomUUID(),
          file,
          error: validation.error,
        });
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newPendingFiles.push({
        id: crypto.randomUUID(),
        file,
        preview,
      });
    }

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
  }, [user, pendingFiles.length]);

  const handleRemoveFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      // Revoke object URL to prevent memory leaks
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // Upload files and return attachments
  const uploadFiles = async (): Promise<FileAttachment[]> => {
    const filesToUpload = pendingFiles.filter((f) => !f.error);
    if (filesToUpload.length === 0) return [];

    setIsUploading(true);
    const attachments: FileAttachment[] = [];

    try {
      // Mark all as uploading
      setPendingFiles((prev) =>
        prev.map((f) => (f.error ? f : { ...f, uploading: true }))
      );

      // Upload each file
      for (const pendingFile of filesToUpload) {
        try {
          const formData = new FormData();
          formData.append('file', pendingFile.file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success && result.file) {
            attachments.push(result.file);
          } else {
            // Mark file as errored
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pendingFile.id
                  ? { ...f, uploading: false, error: result.error || 'Upload failed' }
                  : f
              )
            );
          }
        } catch {
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? { ...f, uploading: false, error: 'Upload failed' }
                : f
            )
          );
        }
      }

      return attachments;
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, []);

  // Check if guest has messages (to switch to fixed mode)
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const hasMessages = (activeSession?.messages?.length || 0) > 0;

  // Guest mode: Show large centered input until they start chatting
  const showGuestMode = !user && !hasMessages;

  // Determine if input should be disabled
  const isDisabled = isLoading || isStreaming || isUploading;

  // Auto-resize textarea based on content (responsive max height)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Use smaller max height on mobile (40vh), larger on desktop (160px)
      const maxHeight = window.innerWidth < 640 ? window.innerHeight * 0.3 : 160;
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        maxHeight
      )}px`;
    }
  }, [input]);

  // Focus input when not loading
  useEffect(() => {
    if (!isDisabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDisabled]);

  // Listen for prompt suggestions from sidebar buttons
  useEffect(() => {
    const handleSuggestPrompt = (e: CustomEvent<{ prompt: string }>) => {
      setInput(e.detail.prompt);
      // Focus the textarea and move cursor to end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            e.detail.prompt.length,
            e.detail.prompt.length
          );
        }
      }, 100);
    };

    window.addEventListener('bakame:suggest-prompt', handleSuggestPrompt as EventListener);
    return () => {
      window.removeEventListener('bakame:suggest-prompt', handleSuggestPrompt as EventListener);
    };
  }, []);

  // Handle iOS virtual keyboard - adjust input position when keyboard appears
  useEffect(() => {
    // Only run on mobile devices
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const handleResize = () => {
      // Calculate the keyboard height by comparing viewport height to window height
      const keyboardHeight = window.innerHeight - visualViewport.height;

      // Find the input container and adjust its bottom position
      const inputContainer = document.querySelector('.chat-input-container');
      if (inputContainer instanceof HTMLElement) {
        if (keyboardHeight > 100) {
          // Keyboard is open - move input above it
          inputContainer.style.paddingBottom = `${keyboardHeight}px`;
        } else {
          // Keyboard is closed - reset padding
          inputContainer.style.paddingBottom = '';
        }
      }
    };

    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleResize);

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    const hasText = input.trim().length > 0;
    const hasValidFiles = pendingFiles.some((f) => !f.error);

    if ((!hasText && !hasValidFiles) || isDisabled) return;

    const message = input.trim();
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Upload files first if any
    let attachments: FileAttachment[] = [];
    if (hasValidFiles) {
      attachments = await uploadFiles();
      // Clear pending files after upload
      pendingFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setPendingFiles([]);
    }

    // Send message with attachments
    await sendMessage(message, attachments);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ============================================
  // GUEST MODE - Simple centered input with gradient glow
  // ============================================
  if (showGuestMode) {
    return (
      <div className="w-full">
        {/* Outer wrapper for gradient glow effect - thin border */}
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-green-500 via-yellow-500 to-green-500
          shadow-lg shadow-green-500/20">
          {/* Inner input container */}
          <div className="relative flex items-end rounded-2xl bg-white dark:bg-[#0a0a0a]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.placeholder}
              disabled={isDisabled}
              rows={2}
              className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                resize-none outline-none focus:outline-none focus:ring-0 border-none text-base
                min-h-[60px] max-h-[200px] rounded-2xl"
            />

            {/* Send button */}
            <div className="p-2">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl bg-green-600 hover:bg-green-700
                  text-white disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-200"
                aria-label={t.send}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // FIXED BOTTOM INPUT - For logged-in users or guests with messages
  // ============================================
  return (
    <div className={`fixed bottom-0 right-0 z-30 transition-all duration-300 ease-out ${
      sidebarOpen && user ? 'left-0 lg:left-64' : 'left-0'
    }`}>
      {/* Gradient fade effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 dark:from-[#0a0a0a] dark:via-[#0a0a0a]/95 to-transparent pointer-events-none" />

      <div className="relative pt-4 pb-4 sm:pb-5 px-3 sm:px-4 fixed-bottom-safe chat-input-container">
        <div className="max-w-2xl mx-auto">
          {/* Clear chat button - above input */}
          {hasMessages && !isStreaming && (
            <div className="flex justify-center mb-3">
              {showClearConfirm ? (
                // Confirmation dialog
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 animate-fadeIn">
                  <span className="text-xs text-red-600 dark:text-red-400">{t.confirmClearChat}</span>
                  <button
                    onClick={confirmClear}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium
                      bg-red-500 text-white hover:bg-red-600
                      transition-colors duration-200"
                  >
                    {t.yes}
                  </button>
                  <button
                    onClick={cancelClear}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium
                      bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300
                      hover:bg-gray-300 dark:hover:bg-white/20
                      transition-colors duration-200"
                  >
                    {t.no}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                    text-gray-400 dark:text-gray-500
                    hover:text-red-500 dark:hover:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-500/10
                    transition-all duration-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>{t.clearChat}</span>
                </button>
              )}
            </div>
          )}

          {/* File preview area - above input */}
          {pendingFiles.length > 0 && (
            <FilePreview
              files={pendingFiles}
              onRemove={handleRemoveFile}
              disabled={isDisabled}
            />
          )}

          {/* Premium input container with gradient border - matching guest style */}
          <div className={`relative p-[1px] rounded-2xl transition-all duration-200
            ${isFocused
              ? 'bg-gradient-to-r from-green-500 via-yellow-500 to-green-500 shadow-lg shadow-green-500/20'
              : 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 dark:from-white/20 dark:via-white/10 dark:to-white/20'
            }`}
          >
          <div
            className="relative flex items-end rounded-2xl bg-white dark:bg-[#0a0a0a]"
          >
            {/* File Upload Button - only for logged-in users */}
            {user && (
              <div className="p-2 pr-0">
                <FileUploadButton
                  onFilesSelected={handleFilesSelected}
                  disabled={isDisabled}
                  hasFiles={pendingFiles.length > 0}
                />
              </div>
            )}

            {/* Location Button */}
            <div className="p-2">
              <button
                onClick={requestLocation}
                disabled={locationLoading}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  hasLocation
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : permissionStatus === 'denied'
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title={
                  hasLocation
                    ? `Location shared (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`
                    : permissionStatus === 'denied'
                    ? 'Location access denied'
                    : 'Share your location for directions'
                }
              >
                {locationLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                isStreaming
                  ? t.pleaseWait
                  : t.placeholder
              }
              disabled={isDisabled}
              rows={1}
              className={`flex-1 py-3 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                resize-none outline-none focus:outline-none focus:ring-0 border-none text-base
                max-h-[160px] ${user ? 'px-2' : 'px-4'}`}
            />

              {/* Send / Stop Button */}
              <div className="p-2">
                {isStreaming ? (
                  <button
                    onClick={cancelRequest}
                    className="p-3 rounded-xl bg-red-600 hover:bg-red-700
                      text-white transition-colors duration-200"
                    aria-label={t.stop}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="5" y="5" width="10" height="10" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={(!input.trim() && pendingFiles.filter(f => !f.error).length === 0) || isLoading || isUploading}
                    className="p-3 rounded-xl bg-green-600 hover:bg-green-700
                      text-white disabled:opacity-40 disabled:cursor-not-allowed
                      transition-colors duration-200"
                    aria-label={t.send}
                  >
                    {isLoading || isUploading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
