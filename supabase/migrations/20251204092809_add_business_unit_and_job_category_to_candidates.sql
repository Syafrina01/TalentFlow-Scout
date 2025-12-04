/*
  # Add Business Unit and Job Category to Candidates

  1. Changes to candidates table
    - `business_unit` (text) - Business unit classification
      Options: Holding Company, Outsourcing Services, Property Development, 
               Property Investment, Integrated Community Solutions
    - `job_category` (text) - Job category classification
      Options: Management, Support Services, Technical, Non-technical
  
  2. Notes
    - These fields will help categorize candidates for reporting and analytics
    - Fields are nullable to support existing data
    - No constraints added to allow flexibility in categorization
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'business_unit'
  ) THEN
    ALTER TABLE candidates ADD COLUMN business_unit text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'job_category'
  ) THEN
    ALTER TABLE candidates ADD COLUMN job_category text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidates_business_unit ON candidates(business_unit);
CREATE INDEX IF NOT EXISTS idx_candidates_job_category ON candidates(job_category);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
