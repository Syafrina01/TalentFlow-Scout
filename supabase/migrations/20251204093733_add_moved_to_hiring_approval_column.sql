/*
  # Add moved_to_hiring_approval Column to Candidates

  1. Changes to candidates table
    - `moved_to_hiring_approval` (boolean) - Tracks if candidate has been moved to hiring approval workflow
  
  2. Notes
    - Field defaults to false
    - Used to prevent duplicate entries in candidate_hiring_flow table
    - Helps filter candidates that are in hiring approval process
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'moved_to_hiring_approval'
  ) THEN
    ALTER TABLE candidates ADD COLUMN moved_to_hiring_approval boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidates_moved_to_hiring_approval 
  ON candidates(moved_to_hiring_approval);
