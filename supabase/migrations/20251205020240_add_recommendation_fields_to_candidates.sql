/*
  # Add Recommendation Fields to Candidates

  1. New Columns
    - `recommendation1_email` (text) - Email of first recommender
    - `recommendation1_name` (text) - Name of first recommender
    - `recommendation1_organization` (text) - Organization of first recommender
    - `recommendation1_relationship` (text) - Relationship to candidate
    - `recommendation1_feedback` (text) - Recommendation feedback/comments
    - `recommendation1_status` (text) - Status: pending/completed/declined
    - `recommendation1_submitted_at` (timestamptz) - When recommendation was submitted
    
    - `recommendation2_email` (text) - Email of second recommender (optional)
    - `recommendation2_name` (text) - Name of second recommender
    - `recommendation2_organization` (text) - Organization of second recommender
    - `recommendation2_relationship` (text) - Relationship to candidate
    - `recommendation2_feedback` (text) - Recommendation feedback/comments
    - `recommendation2_status` (text) - Status: pending/completed/declined
    - `recommendation2_submitted_at` (timestamptz) - When recommendation was submitted
  
  2. Changes
    - These fields support the recommendation collection process
    - Two recommendations can be collected per candidate
    - Recommendation 2 is optional
  
  3. Security
    - No RLS changes needed as these are internal fields managed by the system
*/

-- Add recommendation 1 fields
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS recommendation1_email text,
ADD COLUMN IF NOT EXISTS recommendation1_name text,
ADD COLUMN IF NOT EXISTS recommendation1_organization text,
ADD COLUMN IF NOT EXISTS recommendation1_relationship text,
ADD COLUMN IF NOT EXISTS recommendation1_feedback text,
ADD COLUMN IF NOT EXISTS recommendation1_status text DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS recommendation1_submitted_at timestamptz;

-- Add recommendation 2 fields
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS recommendation2_email text,
ADD COLUMN IF NOT EXISTS recommendation2_name text,
ADD COLUMN IF NOT EXISTS recommendation2_organization text,
ADD COLUMN IF NOT EXISTS recommendation2_relationship text,
ADD COLUMN IF NOT EXISTS recommendation2_feedback text,
ADD COLUMN IF NOT EXISTS recommendation2_status text DEFAULT 'not_requested',
ADD COLUMN IF NOT EXISTS recommendation2_submitted_at timestamptz;