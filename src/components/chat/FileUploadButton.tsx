/**
 * FileUploadButton Component
 *
 * A paperclip button that triggers file selection for uploading
 * images and documents to chat.
 */

'use client';

import { useRef } from 'react';
import { FILE_LIMITS } from '@/types';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  hasFiles?: boolean;
}

export default function FileUploadButton({
  onFilesSelected,
  disabled = false,
  hasFiles = false,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_LIMITS.acceptString}
        onChange={handleChange}
        className="hidden"
        aria-label="Upload files"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`p-3 rounded-xl transition-all duration-200 ${
          hasFiles
            ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Attach files (images, PDF, Word, Excel)"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
          />
        </svg>
      </button>
    </>
  );
}
