/*
  # Add Expected Salary Field

  1. Changes
    - Add `expected_salary` field to candidate_hiring_flow table
    
  2. Details
    - `expected_salary`: Numeric field for candidate's expected salary
    - This field captures what the candidate is expecting to be paid
    - Helps in salary negotiation and package preparation
    
  3. Notes
    - Field is nullable to support existing records
    - Should be filled during salary package preparation phase
*/

DO $$
BEGIN
  -- Add expected_salary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidate_hiring_flow' AND column_name = 'expected_salary'
  ) THEN
    ALTER TABLE candidate_hiring_flow ADD COLUMN expected_salary numeric;
  END IF;
END $$;