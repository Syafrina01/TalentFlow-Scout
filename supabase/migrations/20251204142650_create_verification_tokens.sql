/*
  # Create Verification Tokens System

  1. New Tables
    - `verification_tokens`
      - `id` (uuid, primary key)
      - `candidate_id` (uuid, foreign key to candidate_hiring_flow)
      - `token` (text, unique) - Secure random token for URL
      - `expires_at` (timestamptz) - Token expiration (7 days from creation)
      - `used` (boolean) - Whether token has been used
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `verification_tokens` table
    - Allow anonymous users to read valid tokens for verification
    - Authenticated users can manage tokens
    
  3. Indexes
    - Index on token for fast lookup
    - Index on candidate_id for tracking
*/

CREATE TABLE IF NOT EXISTS verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_hiring_flow(candidate_id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_candidate ON verification_tokens(candidate_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires_at);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can read valid tokens"
  ON verification_tokens
  FOR SELECT
  TO anon
  USING (
    NOT used 
    AND expires_at > now()
  );

CREATE POLICY "Authenticated users can manage tokens"
  ON verification_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);