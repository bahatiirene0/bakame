/**
 * File Utilities
 *
 * Validation and utility functions for file uploads
 *
 * NOTE: extractors.ts is server-only (uses Node.js fs/pdf-parse/etc.)
 * Import directly from './extractors' in server-side code (API routes)
 */

import { FILE_LIMITS, FileType } from '@/types';

/**
 * Validate a file for upload
 * Returns validation result with error message if invalid
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_LIMITS.maxSizeBytes) {
    const maxMB = FILE_LIMITS.maxSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxMB}MB.`,
    };
  }

  // Check file type
  const fileType = getFileType(file.type);
  if (!fileType) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload an image (PNG, JPG, GIF, WebP) or document (PDF, DOCX, XLSX).',
    };
  }

  return { valid: true };
}

/**
 * Get the file type category from MIME type
 * Returns 'image', 'document', or null if unsupported
 */
export function getFileType(mimeType: string): FileType | null {
  if ((FILE_LIMITS.allowedImageTypes as readonly string[]).includes(mimeType)) {
    return 'image';
  }

  if ((FILE_LIMITS.allowedDocumentTypes as readonly string[]).includes(mimeType)) {
    return 'document';
  }

  return null;
}

/**
 * Generate a unique storage path for a file
 * Format: {userId}/{timestamp}-{randomId}-{filename}
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${timestamp}-${randomId}-${safeName}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if a MIME type is an image
 */
export function isImageType(mimeType: string): boolean {
  return (FILE_LIMITS.allowedImageTypes as readonly string[]).includes(mimeType);
}

/**
 * Check if a MIME type is a document
 */
export function isDocumentType(mimeType: string): boolean {
  return (FILE_LIMITS.allowedDocumentTypes as readonly string[]).includes(mimeType);
}

/**
 * Get a human-readable name for a MIME type
 */
export function getMimeTypeName(mimeType: string): string {
  const names: Record<string, string> = {
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'application/pdf': 'PDF Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  };

  return names[mimeType] || 'Unknown';
}
