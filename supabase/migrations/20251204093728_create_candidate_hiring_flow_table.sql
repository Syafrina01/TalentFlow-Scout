/*
  # Create Candidate Hiring Flow Table

  1. New Tables
    - `candidate_hiring_flow`
      - `candidate_id` (uuid, primary key) - Unique identifier for candidate
      - `name` (text) - Candidate full name
      - `position` (text) - Job role applied for
      - `recruiter` (text) - Recruiter name
      - `recruiter_email` (text) - Recruiter email address
      - `hiring_manager1_email` (text) - Mandatory recommender email
      - `hiring_manager2_email` (text, nullable) - Optional recommender email
      - `approver1_email` (text) - Mandatory approver email
      - `approver2_email` (text, nullable) - Optional approver email
      - `current_step` (text) - Current workflow step name
      - `step_status` (jsonb) - Multi-step status tracking
      - `assessment_status` (text) - Assessment completion status
      - `background_check_status` (text) - Background check status
      - `salary_proposal` (jsonb) - Drafted salary proposal details
      - `approvals` (jsonb) - Approval decisions from all stakeholders
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `candidate_hiring_flow` table
    - Add policy for authenticated users to read all records
    - Add policy for authenticated users to insert records
    - Add policy for authenticated users to update records

  3. Indexes
    - Index on current_step for filtering
    - Index on recruiter_email for filtering
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS candidate_hiring_flow (
  candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  recruiter text NOT NULL,
  recruiter_email text NOT NULL,
  hiring_manager1_email text NOT NULL,
  hiring_manager2_email text,
  approver1_email text NOT NULL,
  approver2_email text,
  current_step text NOT NULL DEFAULT 'Selected for Hiring',
  step_status jsonb DEFAULT '{}'::jsonb,
  assessment_status text DEFAULT 'Pending',
  background_check_status text DEFAULT 'Pending',
  salary_proposal jsonb,
  approvals jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_hiring_flow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all hiring flow records" ON candidate_hiring_flow;
DROP POLICY IF EXISTS "Authenticated users can insert hiring flow records" ON candidate_hiring_flow;
DROP POLICY IF EXISTS "Authenticated users can update hiring flow records" ON candidate_hiring_flow;

CREATE POLICY "Authenticated users can read all hiring flow records"
  ON candidate_hiring_flow
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert hiring flow records"
  ON candidate_hiring_flow
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hiring flow records"
  ON candidate_hiring_flow
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_hiring_flow_current_step 
  ON candidate_hiring_flow(current_step);

CREATE INDEX IF NOT EXISTS idx_hiring_flow_recruiter_email 
  ON candidate_hiring_flow(recruiter_email);

CREATE INDEX IF NOT EXISTS idx_hiring_flow_created_at 
  ON candidate_hiring_flow(created_at DESC);

CREATE OR REPLACE FUNCTION update_hiring_flow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hiring_flow_updated_at_trigger ON candidate_hiring_flow;

CREATE TRIGGER update_hiring_flow_updated_at_trigger
  BEFORE UPDATE ON candidate_hiring_flow
  FOR EACH ROW
  EXECUTE FUNCTION update_hiring_flow_updated_at();
