-- Migration: Create chat-files storage bucket for file uploads
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Create the storage bucket for chat file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  false,  -- Private bucket (requires signed URLs)
  10485760,  -- 10MB max file size
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Authenticated users can upload files to their own folder
-- Files are stored as: {user_id}/{timestamp}-{random}-{filename}
CREATE POLICY "Users can upload files to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can read/download their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
