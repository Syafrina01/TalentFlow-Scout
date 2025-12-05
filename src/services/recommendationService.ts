import { supabase } from '../lib/supabase';

export interface RecommendationRequest {
  candidateId: string;
  recommendationNumber: 1 | 2;
  recommenderEmail: string;
}

export async function sendRecommendationRequest(
  request: RecommendationRequest
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-recommendation-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        candidateId: request.candidateId,
        recommendationNumber: request.recommendationNumber,
        recommenderEmail: request.recommenderEmail,
      }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to send recommendation request');
  }

  return result.recommendationUrl;
}

export async function getRecommendationStatus(candidateId: string) {
  const { data, error } = await supabase
    .from('candidate_hiring_flow')
    .select(`
      recommendation1_email,
      recommendation1_name,
      recommendation1_status,
      recommendation1_submitted_at,
      recommendation2_email,
      recommendation2_name,
      recommendation2_status,
      recommendation2_submitted_at
    `)
    .eq('candidate_id', candidateId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
