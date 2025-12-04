/*
  # Add Job Description File Storage Fields to Candidates Table

  1. Changes to Candidates Table
    - `jd_file_path` (text, nullable) - Storage bucket path for the job description file
    - `jd_file_name` (text, nullable) - Original filename for display purposes
    - `jd_file_size` (integer, nullable) - File size in bytes for metadata
    - `jd_file_type` (text, nullable) - MIME type of the uploaded file

  2. Indexing
    - Add index on `jd_file_path` for efficient file lookups

  3. Notes
    - All fields are nullable to maintain backward compatibility
    - Existing candidates without files will have NULL values
    - Files are optional when creating or updating candidates
*/

-- Add job description file fields to candidates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'jd_file_path'
  ) THEN
    ALTER TABLE candidates ADD COLUMN jd_file_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'jd_file_name'
  ) THEN
    ALTER TABLE candidates ADD COLUMN jd_file_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'jd_file_size'
  ) THEN
    ALTER TABLE candidates ADD COLUMN jd_file_size integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'jd_file_type'
  ) THEN
    ALTER TABLE candidates ADD COLUMN jd_file_type text;
  END IF;
END $$;

-- Create index for efficient file path lookups
CREATE INDEX IF NOT EXISTS candidates_jd_file_path_idx ON candidates(jd_file_path) WHERE jd_file_path IS NOT NULL;
