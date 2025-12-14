/**
 * MessageAttachments Component
 *
 * Displays file attachments in chat messages:
 * - Image gallery with click-to-expand
 * - Document list with icons
 */

'use client';

import { useState } from 'react';
import { FileAttachment } from '@/types';
import { formatFileSize, getMimeTypeName } from '@/lib/files';

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
}

export default function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === 'image');
  const documents = attachments.filter((a) => a.type === 'document');

  return (
    <div className="mt-2 space-y-2">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => setExpandedImage(image.url)}
              className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-white/10
                hover:border-green-500 dark:hover:border-green-500 transition-colors duration-200"
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-24 h-24 sm:w-32 sm:h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <DocumentBadge key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <ImageModal imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
      )}
    </div>
  );
}

interface DocumentBadgeProps {
  document: FileAttachment;
}

function DocumentBadge({ document }: DocumentBadgeProps) {
  const typeName = getMimeTypeName(document.mimeType);

  // Get icon color based on type
  const getIconColor = () => {
    if (document.mimeType === 'application/pdf') return 'text-red-500';
    if (document.mimeType.includes('wordprocessingml')) return 'text-blue-500';
    if (document.mimeType.includes('spreadsheetml')) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <DocumentIcon mimeType={document.mimeType} className={`w-5 h-5 ${getIconColor()}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
          {document.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {typeName} &middot; {formatFileSize(document.size)}
        </p>
      </div>
    </div>
  );
}

interface DocumentIconProps {
  mimeType: string;
  className?: string;
}

function DocumentIcon({ mimeType, className = 'w-5 h-5' }: DocumentIconProps) {
  if (mimeType === 'application/pdf') {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9.5 16.5c0 .28-.22.5-.5.5H8v1H7v-4h2c.55 0 1 .45 1 1v1.5zm3 1c0 .55-.45 1-1 1h-2v-4h2c.55 0 1 .45 1 1v2zm4-2.5c0 .28-.22.5-.5.5H15v1h1v1h-1v1h-1v-4h2.5c.28 0 .5.22.5.5z"/>
      </svg>
    );
  }
  if (mimeType.includes('wordprocessingml')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 16.5v-4h1.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H8.5zm5 0v-4h2v1h-1v.5h1v1h-1v1.5h-1z"/>
      </svg>
    );
  }
  if (mimeType.includes('spreadsheetml')) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
      </svg>
    );
  }
  // Generic document
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200"
        aria-label="Close"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={imageUrl}
        alt="Expanded view"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
