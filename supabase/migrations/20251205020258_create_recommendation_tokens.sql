/*
  # Create Recommendation Tokens Table

  1. New Tables
    - `recommendation_tokens`
      - `id` (uuid, primary key)
      - `token` (text, unique) - Secure token for recommendation link
      - `candidate_id` (uuid) - Foreign key to candidates table
      - `recommendation_number` (integer) - Which recommendation (1 or 2)
      - `recommender_email` (text) - Email of the recommender
      - `expires_at` (timestamptz) - Token expiration date
      - `used_at` (timestamptz) - When token was used (null if not used)
      - `created_at` (timestamptz) - When token was created
  
  2. Security
    - Enable RLS on recommendation_tokens table
    - Public read access for token validation (required for external links)
    - Only authenticated users can create tokens
  
  3. Notes
    - Tokens expire after 30 days by default
    - Each token is single-use for security
    - Supports tracking which recommendation (1 or 2)
*/

-- Create recommendation tokens table
CREATE TABLE IF NOT EXISTS recommendation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  recommendation_number integer NOT NULL CHECK (recommendation_number IN (1, 2)),
  recommender_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recommendation_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public to read tokens (needed for external recommendation links)
CREATE POLICY "Anyone can read recommendation tokens"
  ON recommendation_tokens
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can create tokens
CREATE POLICY "Authenticated users can create recommendation tokens"
  ON recommendation_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_tokens_token ON recommendation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_recommendation_tokens_candidate_id ON recommendation_tokens(candidate_id);