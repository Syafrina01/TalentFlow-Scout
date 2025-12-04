import { supabase } from '../lib/supabase';

export interface HiringCandidate {
  candidate_id: string;
  name: string;
  position: string;
  recruiter: string;
  recruiter_email: string;
  hiring_manager1_email: string;
  hiring_manager2_email: string | null;
  approver1_email: string;
  approver2_email: string | null;
  current_step: string;
  assessment_status: string;
  assessment_report_url: string | null;
  assessment_report_name: string | null;
  assessment_score: string | null;
  background_check_status: string;
  background_check_document_url: string | null;
  background_check_document_name: string | null;
  background_check_completed_at: string | null;
  salary_proposal: any;
  approvals: any;
  created_at: string;
  updated_at: string;
}

export async function sendAssessmentNotification(candidate: HiringCandidate, candidateEmail: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-assessment-notification`;

  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      candidateId: candidate.candidate_id,
      candidateName: candidate.name,
      candidateEmail: candidateEmail,
      position: candidate.position,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send assessment notification');
  }
}

export async function uploadAssessmentReport(candidateId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${candidateId}_${Date.now()}.${fileExt}`;
  const filePath = `${candidateId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('assessment-reports')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('assessment-reports')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('candidate_hiring_flow')
    .update({
      assessment_report_url: publicUrl,
      assessment_report_name: file.name,
    })
    .eq('candidate_id', candidateId);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function deleteAssessmentReport(candidateId: string, reportUrl: string): Promise<void> {
  // Extract the file path from the URL
  const urlParts = reportUrl.split('/assessment-reports/');
  if (urlParts.length < 2) throw new Error('Invalid report URL');

  const filePath = urlParts[1].split('?')[0];

  // Delete from storage
  const { error: deleteError } = await supabase.storage
    .from('assessment-reports')
    .remove([filePath]);

  if (deleteError) throw deleteError;

  // Update database to remove the URL and file name
  const { error: updateError } = await supabase
    .from('candidate_hiring_flow')
    .update({
      assessment_report_url: null,
      assessment_report_name: null,
    })
    .eq('candidate_id', candidateId);

  if (updateError) throw updateError;
}

export async function updateAssessmentScore(candidateId: string, score: string): Promise<void> {
  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update({ assessment_score: score })
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function updateAssessmentStatus(candidateId: string, status: 'Pending' | 'Completed'): Promise<void> {
  const updates: any = {
    assessment_status: status,
  };

  if (status === 'Completed') {
    updates.current_step = 'Assessment Completed';
  }

  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update(updates)
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function uploadBackgroundCheckDocument(candidateId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${candidateId}_${Date.now()}.${fileExt}`;
  const filePath = `${candidateId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('background-check-documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('background-check-documents')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('candidate_hiring_flow')
    .update({
      background_check_document_url: publicUrl,
      background_check_document_name: file.name,
    })
    .eq('candidate_id', candidateId);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function deleteBackgroundCheckDocument(candidateId: string, documentUrl: string): Promise<void> {
  // Extract the file path from the URL
  const urlParts = documentUrl.split('/background-check-documents/');
  if (urlParts.length < 2) throw new Error('Invalid document URL');

  const filePath = urlParts[1].split('?')[0];

  // Delete from storage
  const { error: deleteError } = await supabase.storage
    .from('background-check-documents')
    .remove([filePath]);

  if (deleteError) throw deleteError;

  // Update database to remove the URL and file name
  const { error: updateError } = await supabase
    .from('candidate_hiring_flow')
    .update({
      background_check_document_url: null,
      background_check_document_name: null,
    })
    .eq('candidate_id', candidateId);

  if (updateError) throw updateError;
}

export async function updateBackgroundCheckStatus(candidateId: string, status: 'Pending' | 'Completed'): Promise<void> {
  const updates: any = {
    background_check_status: status,
  };

  if (status === 'Completed') {
    updates.current_step = 'Background Check Completed';
    updates.background_check_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update(updates)
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function updateCurrentStep(candidateId: string, step: string): Promise<void> {
  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update({ current_step: step })
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function saveSalaryProposal(candidateId: string, proposal: any): Promise<void> {
  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update({
      salary_proposal: proposal,
      current_step: 'Salary Package Prepared',
    })
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function sendVerificationRequest(candidate: HiringCandidate, verifierEmail: string): Promise<string> {
  const token = crypto.randomUUID();

  const { error: tokenError } = await supabase
    .from('verification_tokens')
    .insert({
      candidate_id: candidate.candidate_id,
      token: token,
    });

  if (tokenError) throw tokenError;

  const { error: updateError } = await supabase
    .from('candidate_hiring_flow')
    .update({
      verifier_email: verifierEmail,
      current_step: 'Ready for Verification – Head, Talent Strategy',
    })
    .eq('candidate_id', candidate.candidate_id);

  if (updateError) throw updateError;

  return token;
}

export async function updateVerificationDecision(candidateId: string, decision: 'Approved' | 'Rejected' | 'Request Change', comment: string): Promise<void> {
  const { data: candidate, error: fetchError } = await supabase
    .from('candidate_hiring_flow')
    .select('approvals')
    .eq('candidate_id', candidateId)
    .single();

  if (fetchError) throw fetchError;

  const approvals = candidate?.approvals || {};
  approvals.verifier = { decision, comment, timestamp: new Date().toISOString() };

  const updates: any = {
    approvals: approvals,
  };

  if (decision === 'Approved') {
    updates.current_step = 'Ready for Recommendation – Hiring Manager 1';
  }

  const { error } = await supabase
    .from('candidate_hiring_flow')
    .update(updates)
    .eq('candidate_id', candidateId);

  if (error) throw error;
}

export async function sendApprovalRequest(
  candidate: HiringCandidate,
  approvalType: 'hm1' | 'hm2' | 'approver1' | 'approver2',
  approverEmail: string
): Promise<string> {
  const token = crypto.randomUUID();

  const { error: tokenError } = await supabase
    .from('approval_tokens_unified')
    .insert({
      candidate_id: candidate.candidate_id,
      token: token,
      approval_type: approvalType,
      approver_email: approverEmail,
    });

  if (tokenError) throw tokenError;

  return token;
}
