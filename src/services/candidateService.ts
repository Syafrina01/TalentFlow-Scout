import { supabase } from '../lib/supabase';
import { Candidate, CreateCandidateInput, UpdateCandidateInput } from '../types/candidate';
import { getAIFitScore, getMultiPositionFitScore, getMultiPositionFitScoreFromFiles } from './openaiService';
import { uploadJobDescription, deleteJobDescription, getJobDescriptionUrl, UploadedFileInfo } from './storageService';
import { getJobDescriptions } from './jobDescriptionService';
import { loadJobDescriptionFiles } from './jdParserService';

export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCandidate(input: CreateCandidateInput, file?: File): Promise<Candidate> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  let fileInfo: UploadedFileInfo | null = null;

  if (file) {
    try {
      fileInfo = await uploadJobDescription(file);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const candidateData = {
    ...input,
    user_id: user.id,
    ...(fileInfo && {
      jd_file_path: fileInfo.path,
      jd_file_name: fileInfo.name,
      jd_file_size: fileInfo.size,
      jd_file_type: fileInfo.type
    })
  };

  const { data, error } = await supabase
    .from('candidates')
    .insert([candidateData])
    .select()
    .single();

  if (error) {
    if (fileInfo) {
      await deleteJobDescription(fileInfo.path).catch(() => {});
    }
    throw error;
  }

  return data;
}

export async function updateCandidate(
  id: string,
  input: UpdateCandidateInput,
  file?: File | null,
  removeFile?: boolean
): Promise<Candidate> {
  const { data: existingCandidate, error: fetchError } = await supabase
    .from('candidates')
    .select('jd_file_path')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  let fileInfo: UploadedFileInfo | null = null;
  const updateData: any = { ...input };

  if (removeFile && existingCandidate?.jd_file_path) {
    await deleteJobDescription(existingCandidate.jd_file_path).catch(() => {});
    updateData.jd_file_path = null;
    updateData.jd_file_name = null;
    updateData.jd_file_size = null;
    updateData.jd_file_type = null;
  } else if (file) {
    if (existingCandidate?.jd_file_path) {
      await deleteJobDescription(existingCandidate.jd_file_path).catch(() => {});
    }

    fileInfo = await uploadJobDescription(file);
    updateData.jd_file_path = fileInfo.path;
    updateData.jd_file_name = fileInfo.name;
    updateData.jd_file_size = fileInfo.size;
    updateData.jd_file_type = fileInfo.type;
  }

  const { data, error } = await supabase
    .from('candidates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCandidate(id: string): Promise<void> {
  const { data: candidate, error: fetchError } = await supabase
    .from('candidates')
    .select('jd_file_path')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  if (candidate?.jd_file_path) {
    await deleteJobDescription(candidate.jd_file_path).catch(() => {});
  }

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function scoreCandidate(candidate: Candidate): Promise<Candidate> {
  try {
    console.log('Starting candidate scoring for:', candidate.full_name);

    const jobDescriptionFiles = await loadJobDescriptionFiles();

    if (jobDescriptionFiles.length === 0) {
      throw new Error('No job description files could be loaded. Please check:\n1. Files exist in public/job-descriptions/\n2. Files are valid .docx format\n3. Browser console for detailed errors');
    }

    console.log(`Found ${jobDescriptionFiles.length} job descriptions, sending to AI...`);

    const scoreResult = await getMultiPositionFitScoreFromFiles(candidate, jobDescriptionFiles);

    console.log('AI scoring complete, updating database...');

    const { data, error } = await supabase
      .from('candidates')
      .update({
        ai_fit_score: scoreResult.best_match.score,
        ai_fit_comment: scoreResult.overall_comment,
        ai_recommended_position: scoreResult.best_match.position_title,
        ai_recommended_position_id: null,
        ai_all_position_scores: scoreResult.all_matches
      })
      .eq('id', candidate.id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Candidate scored successfully!');
    return data;
  } catch (error) {
    console.error('Error in scoreCandidate:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    if (error instanceof Error) {
      throw new Error(`Failed to score candidate: ${error.message}`);
    }

    const errorMessage = typeof error === 'string' ? error :
                        error && typeof error === 'object' && 'message' in error ? String((error as any).message) :
                        'Unknown error occurred. Check browser console for details.';

    throw new Error(`Failed to score candidate: ${errorMessage}`);
  }
}

export async function getCandidateFileUrl(candidate: Candidate): Promise<string | null> {
  if (!candidate.jd_file_path) {
    return null;
  }

  try {
    return await getJobDescriptionUrl(candidate.jd_file_path);
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return null;
  }
}
