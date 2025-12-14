/**
 * File Upload API Route
 *
 * Handles file uploads for chat attachments:
 * - Validates file type and size
 * - Uploads to Supabase Storage
 * - Extracts text from documents (PDF, DOCX, XLSX)
 * - Returns signed URL for access
 *
 * SECURITY:
 * - Authentication required (no guest uploads)
 * - Server-side validation
 * - Files stored in private bucket with user isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  validateFile,
  getFileType,
  generateStoragePath,
  isDocumentType,
} from '@/lib/files';
import { extractDocumentText } from '@/lib/files/extractors';
import { FileAttachment, FILE_LIMITS } from '@/types';

// Storage bucket name
const STORAGE_BUCKET = 'chat-files';

// Signed URL expiry (1 hour)
const URL_EXPIRY_SECONDS = 3600;

export async function POST(request: NextRequest) {
  try {
    // Get user IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

    // Check authentication - required for uploads
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to upload files' },
        { status: 401 }
      );
    }

    // Rate limiting (use upload-specific identifier)
    const rateLimitResult = checkRateLimit(`upload:${userIp}`, true);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Upload rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file (type and size)
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Get file type category
    const fileType = getFileType(file.type);
    if (!fileType) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage path (user-isolated)
    const storagePath = generateStoragePath(user.id, file.name);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file. Please try again.' },
        { status: 500 }
      );
    }

    // Get signed URL for secure access
    const { data: urlData, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(uploadData.path, URL_EXPIRY_SECONDS);

    if (urlError || !urlData?.signedUrl) {
      console.error('Signed URL error:', urlError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate file URL' },
        { status: 500 }
      );
    }

    // Extract text from documents
    let extractedText: string | undefined;
    if (isDocumentType(file.type)) {
      try {
        extractedText = await extractDocumentText(buffer, file.type);
      } catch (extractError) {
        console.error('Text extraction error:', extractError);
        // Continue without extracted text - don't fail the upload
        extractedText = '[Text extraction failed]';
      }
    }

    // Build file attachment response
    const attachment: FileAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      type: fileType,
      mimeType: file.type,
      size: file.size,
      url: urlData.signedUrl,
      extractedText,
      uploadedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      file: attachment,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
