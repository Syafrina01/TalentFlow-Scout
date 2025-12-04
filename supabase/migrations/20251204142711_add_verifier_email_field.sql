/*
  # Add Verifier Email Field

  1. Changes
    - Add `verifier_email` (text, nullable) - Email of Head, Talent Strategy or verifier who reviews salary package

  2. Notes
    - This field supports Phase 5: Verification by Head, Talent Strategy
    - Verifier receives email to approve/reject/request changes to salary proposal
*/

-- Add verifier email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidate_hiring_flow' AND column_name = 'verifier_email'
  ) THEN
    ALTER TABLE candidate_hiring_flow ADD COLUMN verifier_email text;
  END IF;
END $$;