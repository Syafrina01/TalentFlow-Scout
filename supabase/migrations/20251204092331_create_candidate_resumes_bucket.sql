/*
  # Create Candidate Resumes Storage Bucket

  1. Storage Bucket Setup
    - Create private bucket named "job-descriptions" for candidate resumes/CVs
    - Configure bucket for authenticated user access only
    - Set file size limits and allowed MIME types

  2. Security Policies
    - Users can upload files to their own user-scoped paths
    - Users can read only their own uploaded files
    - Users can delete only their own uploaded files
    - Users can update only their own uploaded files

  3. Notes
    - Maximum file size: 10MB
    - Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG
    - Files are organized by user_id for isolation
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-descriptions',
  'job-descriptions',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload job descriptions to own directory" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own job descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own job descriptions" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own job descriptions" ON storage.objects;

-- Policy: Users can upload files to their own user directory
CREATE POLICY "Users can upload job descriptions to own directory"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-descriptions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read own job descriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-descriptions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own job descriptions"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-descriptions' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'job-descriptions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own job descriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-descriptions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
