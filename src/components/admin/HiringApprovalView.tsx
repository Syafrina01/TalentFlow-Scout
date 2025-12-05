import { useState, useEffect, Fragment } from 'react';
import { RefreshCw, Search, Users, CheckCircle, Clock, AlertCircle, Mail, FileCheck, DollarSign, Send, ChevronDown, ChevronUp, X, Eye, Upload, Download, Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendAssessmentNotification, uploadAssessmentReport, deleteAssessmentReport, updateAssessmentScore, updateAssessmentStatus, updateBackgroundCheckStatus, updateCurrentStep, uploadBackgroundCheckDocument, deleteBackgroundCheckDocument, saveSalaryProposal, sendVerificationRequest, updateVerificationDecision, sendApprovalRequest, HiringCandidate as ImportedHiringCandidate } from '../../services/hiringFlowService';
import SmartSalaryAnalysis from '../hiring/SmartSalaryAnalysis';
import RecommendationSection from '../hiring/RecommendationSection';
import { getPublicBaseUrl } from '../../utils/urlHelper';
import EditCandidateModal from '../EditCandidateModal';
import { updateCandidate, deleteCandidate } from '../../services/candidateService';
import Notification from '../Notification';

type HiringCandidate = ImportedHiringCandidate;

interface EmailPreview {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  position: string;
  senderName: string;
  senderEmail: string;
}

interface VerificationEmailPreview {
  candidateId: string;
  candidateName: string;
  position: string;
  verifierEmail: string;
  salaryProposal: any;
  candidate: HiringCandidate;
}

export default function HiringApprovalView() {
  const [candidates, setCandidates] = useState<HiringCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [verificationEmailPreview, setVerificationEmailPreview] = useState<VerificationEmailPreview | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [uploadingAssessment, setUploadingAssessment] = useState<string | null>(null);
  const [assessmentScores, setAssessmentScores] = useState<{ [key: string]: string }>({});
  const [showSalaryForm, setShowSalaryForm] = useState<string | null>(null);
  const [salaryFormData, setSalaryFormData] = useState({
    basicSalary: '',
    allowances: [] as Array<{name: string, amount: string}>
  });
  const [savingSalary, setSavingSalary] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCandidateForEdit, setSelectedCandidateForEdit] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [resendVerificationEmail, setResendVerificationEmail] = useState<{ [key: string]: string }>({});
  const [showResendForm, setShowResendForm] = useState<string | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_hiring_flow')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewEmail = async (candidate: HiringCandidate, candidateEmail: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        showNotification('Authentication required', 'error');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      setEmailPreview({
        candidateId: candidate.candidate_id,
        candidateName: candidate.name,
        candidateEmail,
        position: candidate.position,
        senderName: profile?.full_name || user.email.split('@')[0] || 'Talent Acquisition Team',
        senderEmail: user.email
      });
    } catch (error) {
      console.error('Error preparing email preview:', error);
      showNotification('Failed to prepare email preview', 'error');
    }
  };

  const handlePreviewVerificationEmail = async (candidate: HiringCandidate, verifierEmail: string) => {
    try {
      setVerificationEmailPreview({
        candidateId: candidate.candidate_id,
        candidateName: candidate.name,
        position: candidate.position,
        verifierEmail: verifierEmail,
        salaryProposal: candidate.salary_proposal,
        candidate: candidate
      });
    } catch (error) {
      console.error('Error preparing verification email preview:', error);
      showNotification('Failed to prepare verification email preview', 'error');
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!verificationEmailPreview) return;

    const { candidate, verifierEmail } = verificationEmailPreview;

    setProcessingAction(candidate.candidate_id);
    try {
      const token = await sendVerificationRequest(candidate, verifierEmail);

      const baseUrl = getPublicBaseUrl();
      const verifyUrl = `${baseUrl}/verify?token=${token}&candidate=${encodeURIComponent(candidate.name)}&position=${encodeURIComponent(candidate.position)}`;

      const subject = `Salary Package Verification Required - ${candidate.name} (${candidate.position})`;

      const allowancesText = candidate.salary_proposal?.allowances && candidate.salary_proposal.allowances.length > 0
        ? '\n\nAllowances:\n' + candidate.salary_proposal.allowances.map((a: any) => `- ${a.name}: ${a.amount}`).join('\n')
        : '';

      const body = `Dear Verifier,

A salary package requires your verification and approval.

Candidate Information:
- Name: ${candidate.name}
- Position: ${candidate.position}
- Recruiter: ${candidate.recruiter} (${candidate.recruiter_email})

Assessment & Background Check:
- Assessment Status: ${candidate.assessment_status}${candidate.assessment_score ? `\n- Assessment Score: ${candidate.assessment_score}` : ''}
- Background Check: ${candidate.background_check_status}

Proposed Salary Package:
- Basic Salary: ${candidate.salary_proposal?.basic_salary || 'N/A'}${allowancesText}
- Total Salary: ${candidate.salary_proposal?.total_salary || 'N/A'}

VERIFICATION LINK:
${verifyUrl}

Click the link above and select your decision:
✓ Approve  |  ⟳ Request Change  |  ✗ Reject

Note: This link is valid for 7 days and can only be used once. Click the link and select your decision on the verification page.

If you have any questions, please contact the recruitment team.

Best regards,
Talent Acquisition Team`;

      const mailtoLink = `mailto:${verifierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.open(mailtoLink, '_blank');
      await loadCandidates();
      setVerificationEmailPreview(null);
    } catch (error: any) {
      showNotification(error.message || 'Failed to send verification request', 'error');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleResendVerificationEmail = async (candidateId: string, newEmail: string) => {
    if (!newEmail || !newEmail.includes('@')) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    setProcessingAction(candidateId);
    try {
      const candidate = candidates.find(c => c.candidate_id === candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const token = await sendVerificationRequest(candidate, newEmail);

      const baseUrl = getPublicBaseUrl();
      const verifyUrl = `${baseUrl}/verify?token=${token}&candidate=${encodeURIComponent(candidate.name)}&position=${encodeURIComponent(candidate.position)}`;

      const subject = `Salary Package Verification Required - ${candidate.name} (${candidate.position})`;

      const allowancesText = candidate.salary_proposal?.allowances && candidate.salary_proposal.allowances.length > 0
        ? '\n\nAllowances:\n' + candidate.salary_proposal.allowances.map((a: any) => `- ${a.name}: ${a.amount}`).join('\n')
        : '';

      const body = `Dear Verifier,

A salary package requires your verification and approval.

Candidate Information:
- Name: ${candidate.name}
- Position: ${candidate.position}
- Recruiter: ${candidate.recruiter} (${candidate.recruiter_email})

Assessment & Background Check:
- Assessment Status: ${candidate.assessment_status}${candidate.assessment_score ? `\n- Assessment Score: ${candidate.assessment_score}` : ''}
- Background Check: ${candidate.background_check_status}

Proposed Salary Package:
- Basic Salary: ${candidate.salary_proposal?.basic_salary || 'N/A'}${allowancesText}
- Total Salary: ${candidate.salary_proposal?.total_salary || 'N/A'}

VERIFICATION LINK:
${verifyUrl}

Click the link above and select your decision:
✓ Approve  |  ⟳ Request Change  |  ✗ Reject

Note: This link is valid for 7 days and can only be used once. Click the link and select your decision on the verification page.

If you have any questions, please contact the recruitment team.

Best regards,
Talent Acquisition Team`;

      const mailtoLink = `mailto:${newEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      window.open(mailtoLink, '_blank');
      await loadCandidates();
      showNotification('Email draft opened successfully', 'success');
      setShowResendForm(null);
      setResendVerificationEmail({});
    } catch (error: any) {
      showNotification(error.message || 'Failed to resend verification link', 'error');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSendEmail = () => {
    if (!emailPreview) return;

    const subject = `Online Assessment Invitation - ${emailPreview.position}`;
    const body = `Dear ${emailPreview.candidateName},

Congratulations on being selected for the ${emailPreview.position} position!

As the next step in our hiring process, we kindly request you to complete an online assessment.

Assessment Details:
- Platform: Found.it Assessments
- Assessment Link: https://assessments-dashboard.foundit.in/login
- Your Email: ${emailPreview.candidateEmail}
- Deadline: 48 hours from receipt of this email

Instructions:
1. Click on the assessment link: https://assessments-dashboard.foundit.in/login
2. Log in using your email address: ${emailPreview.candidateEmail}
3. Complete all sections of the assessment
4. Submit your responses before the deadline

Please note:
- The assessment should take approximately 45-60 minutes to complete
- Ensure you have a stable internet connection
- Complete the assessment in one sitting if possible
- Contact the recruitment team if you encounter any technical issues

If you have any questions or need assistance, please don't hesitate to reach out to our recruitment team.

We look forward to reviewing your assessment results.

Best regards,
${emailPreview.senderName}`;

    const mailtoLink = `mailto:${emailPreview.candidateEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(mailtoLink, '_blank');
    setEmailPreview(null);
  };

  const handleEditCandidate = async (candidateId: string) => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedCandidateForEdit(data);
        setIsEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading candidate for edit:', error);
      showNotification('Failed to load candidate data', 'error');
    }
  };

  const handleUpdateCandidate = async (id: string, data: any, file?: File | null, removeFile?: boolean) => {
    try {
      await updateCandidate(id, data, file, removeFile);
      await loadCandidates();
      setIsEditModalOpen(false);
      setSelectedCandidateForEdit(null);
    } catch (error) {
      console.error('Error updating candidate:', error);
      showNotification('Failed to update candidate', 'error');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate? This will also remove all hiring flow data.')) return;

    try {
      await deleteCandidate(candidateId);
      await loadCandidates();
      showNotification('Candidate deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting candidate:', error);
      showNotification('Failed to delete candidate', 'error');
    }
  };

  const getStepProgress = (step: string): number => {
    const steps = [
      'Selected for Hiring',
      'Assessment Completed',
      'Background Check Completed',
      'Salary Package Prepared',
      'Ready for Verification – Head, Talent Strategy',
      'Ready for Recommendation – Hiring Manager 1',
      'Ready for Recommendation – Hiring Manager 2',
      'Ready for Approval – Approver 1',
      'Ready for Approval – Approver 2',
      'Ready for Contract Issuance',
      'Contract Issued',
    ];
    const index = steps.indexOf(step);
    return index >= 0 ? ((index + 1) / steps.length) * 100 : 0;
  };

  const getStepColor = (step: string): string => {
    if (step.includes('Contract Issued')) return 'text-green-600';
    if (step.includes('Approval')) return 'text-orange-600';
    if (step.includes('Recommendation')) return 'text-blue-600';
    if (step.includes('Verification')) return 'text-purple-600';
    return 'text-cyan-600';
  };

  const getStepBgColor = (step: string): string => {
    if (step.includes('Contract Issued')) return 'bg-green-100';
    if (step.includes('Approval')) return 'bg-orange-100';
    if (step.includes('Recommendation')) return 'bg-blue-100';
    if (step.includes('Verification')) return 'bg-purple-100';
    return 'bg-cyan-100';
  };

  const handleUploadAssessmentReport = async (candidateId: string, file: File) => {
    setUploadingAssessment(candidateId);
    try {
      await uploadAssessmentReport(candidateId, file);
      await loadCandidates();
    } catch (error) {
      console.error('Error uploading assessment report:', error);
      showNotification('Failed to upload assessment report', 'error');
    } finally {
      setUploadingAssessment(null);
    }
  };

  const handleSaveAssessmentScore = async (candidateId: string, score: string) => {
    if (!score.trim()) {
      showNotification('Please enter a score', 'error');
      return;
    }
    try {
      await updateAssessmentScore(candidateId, score);
      await loadCandidates();
    } catch (error) {
      console.error('Error saving assessment score:', error);
      showNotification('Failed to save assessment score', 'error');
    }
  };

  const handleUploadBackgroundCheck = async (candidateId: string, file: File) => {
    setUploadingDocument(candidateId);
    try {
      await uploadBackgroundCheckDocument(candidateId, file);
      await loadCandidates();
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification('Failed to upload document', 'error');
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleDeleteAssessmentReport = async (candidateId: string, reportUrl: string) => {
    if (!confirm('Are you sure you want to delete this assessment report?')) {
      return;
    }
    try {
      await deleteAssessmentReport(candidateId, reportUrl);
      await loadCandidates();
    } catch (error) {
      console.error('Error deleting assessment report:', error);
      showNotification('Failed to delete assessment report', 'error');
    }
  };

  const handleDeleteBackgroundCheck = async (candidateId: string, documentUrl: string) => {
    if (!confirm('Are you sure you want to delete this background check document?')) {
      return;
    }
    try {
      await deleteBackgroundCheckDocument(candidateId, documentUrl);
      await loadCandidates();
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('Failed to delete document', 'error');
    }
  };

  const calculateTotalSalary = (basicSalary: string, allowances: Array<{name: string, amount: string}>): number => {
    const parseAmount = (str: string): number => {
      const cleaned = str.replace(/[^0-9.]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const basic = parseAmount(basicSalary);
    const allowancesTotal = allowances.reduce((sum, allowance) => sum + parseAmount(allowance.amount), 0);
    return basic + allowancesTotal;
  };

  const addAllowanceField = () => {
    setSalaryFormData({
      ...salaryFormData,
      allowances: [...salaryFormData.allowances, { name: '', amount: '' }]
    });
  };

  const removeAllowanceField = (index: number) => {
    setSalaryFormData({
      ...salaryFormData,
      allowances: salaryFormData.allowances.filter((_, i) => i !== index)
    });
  };

  const updateAllowanceField = (index: number, field: 'name' | 'amount', value: string) => {
    const newAllowances = [...salaryFormData.allowances];
    newAllowances[index][field] = value;
    setSalaryFormData({
      ...salaryFormData,
      allowances: newAllowances
    });
  };

  const handleSaveSalaryPackage = async (candidate: HiringCandidate, smartData?: any) => {
    const dataToSave = smartData || {
      basicSalary: salaryFormData.basicSalary,
      allowances: salaryFormData.allowances,
      totalSalary: calculateTotalSalary(salaryFormData.basicSalary, salaryFormData.allowances)
    };

    if (!dataToSave.basicSalary) {
      showNotification('Please fill in Basic Salary', 'error');
      return;
    }

    try {
      const salaryPackage = {
        basic_salary: dataToSave.basicSalary,
        allowances: dataToSave.allowances?.filter((a: any) => a.name && a.amount) || [],
        total_salary: `RM ${dataToSave.totalSalary?.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        // Store enhanced data if available
        job_title: dataToSave.jobTitle,
        years_of_experience: dataToSave.yearsOfExperience,
        band_min_rm: dataToSave.bandMinRM,
        band_mid_rm: dataToSave.bandMidRM,
        band_max_rm: dataToSave.bandMaxRM,
        team_median_salary: dataToSave.teamMedianSalary,
        role_budget_max_ctc: dataToSave.roleBudgetMaxCTC,
        employer_contribution_pct: dataToSave.employerContributionPct,
        allowances_total: dataToSave.allowancesTotal,
        allowance_ratio: dataToSave.allowanceRatio,
        employer_contribution_rm: dataToSave.employerContributionRM,
        total_ctc: dataToSave.totalCTC,
        ai_insight: dataToSave.aiInsight
      };

      await saveSalaryProposal(candidate.candidate_id, salaryPackage);
      await loadCandidates();

      setShowSalaryForm(null);
      setSalaryFormData({ basicSalary: '', allowances: [] });
    } catch (error: any) {
      console.error('Error saving salary package:', error);
      showNotification(error.message || 'Failed to save salary package', 'error');
    }
  };

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.recruiter.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: candidates.length,
    inProgress: candidates.filter((c) => c.current_step !== 'Contract Issued').length,
    completed: candidates.filter((c) => c.current_step === 'Contract Issued').length,
    pendingAssessment: candidates.filter((c) => c.assessment_status === 'Pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hiring Approval Process</h1>
          <p className="text-slate-600 mt-1">Track and manage candidate hiring workflows</p>
        </div>
        <button
          onClick={loadCandidates}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Candidates</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Pending Assessment</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.pendingAssessment}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name, position, or recruiter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No candidates found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Candidate</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Position</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Recruiter</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Current Step</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Progress</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCandidates.map((candidate) => (
                  <Fragment key={candidate.candidate_id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedCandidate(expandedCandidate === candidate.candidate_id ? null : candidate.candidate_id)}
                            className="text-slate-600 hover:text-cyan-600 transition-colors"
                          >
                            {expandedCandidate === candidate.candidate_id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="font-medium text-slate-800">{candidate.name}</div>
                            <div className="text-xs text-slate-500">
                              Added {new Date(candidate.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{candidate.position}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{candidate.recruiter}</div>
                        <div className="text-xs text-slate-500">{candidate.recruiter_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStepBgColor(
                            candidate.current_step
                          )} ${getStepColor(candidate.current_step)}`}
                        >
                          {candidate.current_step}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-cyan-600 h-2 rounded-full transition-all"
                            style={{ width: `${getStepProgress(candidate.current_step)}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {Math.round(getStepProgress(candidate.current_step))}% complete
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {candidate.assessment_status === 'Completed' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Assessment Done
                            </span>
                          )}
                          {candidate.background_check_status === 'Completed' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              BG Check Done
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditCandidate(candidate.candidate_id)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit candidate"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.candidate_id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedCandidate === candidate.candidate_id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-slate-50">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-cyan-600" />
                                  Phase 2: Online Assessment
                                </h4>
                                <div className="space-y-3">
                                  <div className="text-sm text-slate-600">
                                    Status: <span className={`font-medium ${candidate.assessment_status === 'Completed' ? 'text-green-600' : 'text-orange-600'}`}>{candidate.assessment_status}</span>
                                  </div>

                                  {candidate.current_step === 'Selected for Hiring' && candidate.assessment_status === 'Pending' && (
                                    <div className="flex gap-2">
                                      <input
                                        type="email"
                                        id={`email-${candidate.candidate_id}`}
                                        placeholder="Candidate email"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                      />
                                      <button
                                        onClick={async () => {
                                          const emailInput = document.getElementById(`email-${candidate.candidate_id}`) as HTMLInputElement;
                                          const email = emailInput?.value;
                                          if (!email) {
                                            showNotification('Please enter candidate email', 'error');
                                            return;
                                          }
                                          await handlePreviewEmail(candidate, email);
                                        }}
                                        disabled={processingAction === candidate.candidate_id}
                                        className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <Eye className="w-3 h-3" />
                                        Preview
                                      </button>
                                    </div>
                                  )}

                                  {candidate.assessment_report_name && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                      <FileCheck className="w-4 h-4 text-green-600" />
                                      <span className="flex-1 truncate">{candidate.assessment_report_name}</span>
                                      <div className="flex gap-2">
                                        {candidate.assessment_report_url && (
                                          <a
                                            href={candidate.assessment_report_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-600 hover:text-cyan-700"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                        )}
                                        <button
                                          onClick={() => candidate.assessment_report_url && handleDeleteAssessmentReport(candidate.candidate_id, candidate.assessment_report_url)}
                                          className="text-red-600 hover:text-red-700"
                                          title="Delete assessment report"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {candidate.assessment_score && (
                                    <div className="text-sm bg-green-50 border border-green-200 p-2 rounded">
                                      <span className="font-medium text-slate-700">Score: </span>
                                      <span className="text-green-700 font-semibold">{candidate.assessment_score}</span>
                                    </div>
                                  )}

                                  {candidate.assessment_status === 'Pending' && (
                                    <div className="space-y-2">
                                      <label className="w-full px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                                        <Upload className="w-4 h-4" />
                                        {uploadingAssessment === candidate.candidate_id ? 'Uploading...' : 'Upload Assessment Report'}
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                          disabled={uploadingAssessment === candidate.candidate_id}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleUploadAssessmentReport(candidate.candidate_id, file);
                                            }
                                          }}
                                        />
                                      </label>

                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={assessmentScores[candidate.candidate_id] || candidate.assessment_score || ''}
                                          onChange={(e) => setAssessmentScores({ ...assessmentScores, [candidate.candidate_id]: e.target.value })}
                                          placeholder="Enter score (e.g., 85/100, A+)"
                                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                        />
                                        <button
                                          onClick={() => handleSaveAssessmentScore(candidate.candidate_id, assessmentScores[candidate.candidate_id] || '')}
                                          disabled={!assessmentScores[candidate.candidate_id]}
                                          className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
                                        >
                                          Save Score
                                        </button>
                                      </div>

                                      <button
                                        onClick={async () => {
                                          setProcessingAction(candidate.candidate_id);
                                          try {
                                            await updateAssessmentStatus(candidate.candidate_id, 'Completed');
                                            await loadCandidates();
                                          } catch (error) {
                                            showNotification('Failed to update status', 'error');
                                          } finally {
                                            setProcessingAction(null);
                                          }
                                        }}
                                        disabled={processingAction === candidate.candidate_id}
                                        className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark Assessment Complete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <FileCheck className="w-4 h-4 text-cyan-600" />
                                  Phase 3: Background Check (Optional)
                                </h4>
                                <div className="space-y-3">
                                  <div className="text-sm text-slate-600">
                                    Status: <span className={`font-medium ${candidate.background_check_status === 'Completed' ? 'text-green-600' : 'text-orange-600'}`}>{candidate.background_check_status}</span>
                                  </div>

                                  {candidate.background_check_document_name && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                      <FileCheck className="w-4 h-4 text-green-600" />
                                      <span className="flex-1 truncate">{candidate.background_check_document_name}</span>
                                      <div className="flex gap-2">
                                        {candidate.background_check_document_url && (
                                          <a
                                            href={candidate.background_check_document_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-600 hover:text-cyan-700"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                        )}
                                        <button
                                          onClick={() => candidate.background_check_document_url && handleDeleteBackgroundCheck(candidate.candidate_id, candidate.background_check_document_url)}
                                          className="text-red-600 hover:text-red-700"
                                          title="Delete background check document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {candidate.assessment_status === 'Completed' && candidate.background_check_status === 'Pending' && (
                                    <div className="space-y-2">
                                      <label className="w-full px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                                        <Upload className="w-4 h-4" />
                                        {uploadingDocument === candidate.candidate_id ? 'Uploading...' : 'Upload Background Check Report'}
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                          disabled={uploadingDocument === candidate.candidate_id}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleUploadBackgroundCheck(candidate.candidate_id, file);
                                            }
                                          }}
                                        />
                                      </label>

                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          onClick={async () => {
                                            setProcessingAction(candidate.candidate_id);
                                            try {
                                              await updateBackgroundCheckStatus(candidate.candidate_id, 'Completed');
                                              await loadCandidates();
                                            } catch (error) {
                                              showNotification('Failed to update status', 'error');
                                            } finally {
                                              setProcessingAction(null);
                                            }
                                          }}
                                          disabled={processingAction === candidate.candidate_id}
                                          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Complete Background Check
                                        </button>

                                        <button
                                          onClick={async () => {
                                            if (confirm('Mark background check as not required for this candidate?')) {
                                              setProcessingAction(candidate.candidate_id);
                                              try {
                                                await updateBackgroundCheckStatus(candidate.candidate_id, 'Not Required');
                                                await loadCandidates();
                                              } catch (error) {
                                                showNotification('Failed to update status', 'error');
                                              } finally {
                                                setProcessingAction(null);
                                              }
                                            }
                                          }}
                                          disabled={processingAction === candidate.candidate_id}
                                          className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                          <X className="w-4 h-4" />
                                          Not Required
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {candidate.assessment_status === 'Completed' && (candidate.background_check_status === 'Completed' || candidate.background_check_status === 'Not Required') && candidate.current_step === 'Background Check Completed' && (
                              <div className="bg-white border border-cyan-200 rounded-lg p-4">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-cyan-600" />
                                  Phase 4: Salary Package Preparation
                                </h4>

                                {showSalaryForm === candidate.candidate_id ? (
                                  <SmartSalaryAnalysis
                                    basicSalary={salaryFormData.basicSalary}
                                    allowances={salaryFormData.allowances}
                                    candidateName={candidate.name}
                                    position={candidate.position}
                                    onSave={async (data) => {
                                      setSavingSalary(true);
                                      try {
                                        await handleSaveSalaryPackage(candidate, data);
                                      } finally {
                                        setSavingSalary(false);
                                      }
                                    }}
                                    onCancel={() => {
                                      setShowSalaryForm(null);
                                      setSalaryFormData({ basicSalary: '', allowances: [] });
                                    }}
                                    saving={savingSalary}
                                  />
                                ) : (
                                  <button
                                    onClick={() => {
                                      setShowSalaryForm(candidate.candidate_id);
                                      setSalaryFormData({ basicSalary: '', allowances: [] });
                                    }}
                                    className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center justify-center gap-2"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                    Prepare Salary Package
                                  </button>
                                )}
                              </div>
                            )}

                            {candidate.salary_proposal && candidate.current_step === 'Salary Package Prepared' && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Salary Package Saved
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="bg-white rounded p-3">
                                    <div className="font-semibold text-slate-800 mb-1">Basic Salary</div>
                                    <div className="text-slate-600 font-medium">{candidate.salary_proposal.basic_salary}</div>
                                  </div>

                                  {candidate.salary_proposal.allowances && candidate.salary_proposal.allowances.length > 0 && (
                                    <div className="bg-white rounded p-3">
                                      <div className="font-semibold text-slate-800 mb-2">Allowances</div>
                                      <div className="space-y-1">
                                        {candidate.salary_proposal.allowances.map((allowance: any, index: number) => (
                                          <div key={index} className="flex justify-between text-slate-600">
                                            <span>{allowance.name}</span>
                                            <span className="font-medium">{allowance.amount}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-slate-800">Total Salary</span>
                                      <span className="text-green-700 font-bold text-xl">{candidate.salary_proposal.total_salary}</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 mt-3">
                                    <input
                                      type="email"
                                      id={`verifier-${candidate.candidate_id}`}
                                      placeholder="Verifier email (Head, Talent Strategy)"
                                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                    />
                                    <button
                                      onClick={async () => {
                                        const verifierInput = document.getElementById(`verifier-${candidate.candidate_id}`) as HTMLInputElement;
                                        const verifierEmail = verifierInput?.value;
                                        if (!verifierEmail) {
                                          showNotification('Please enter verifier email', 'error');
                                          return;
                                        }
                                        await handlePreviewVerificationEmail(candidate, verifierEmail);
                                      }}
                                      disabled={processingAction === candidate.candidate_id}
                                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Preview Email
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {candidate.current_step === 'Ready for Verification – Head, Talent Strategy' && (
                              <div className="bg-white border border-cyan-200 rounded-lg p-4">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-cyan-600" />
                                  Phase 5: Awaiting Verification
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-amber-600 font-medium">Verifier</p>
                                        <p className="text-sm text-amber-900 font-semibold">{candidate.verifier_email}</p>
                                      </div>
                                      <div className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                                        Pending
                                      </div>
                                    </div>
                                  </div>

                                  {candidate.salary_proposal && (
                                    <div className="bg-slate-50 rounded p-3">
                                      <div className="font-semibold text-slate-800 mb-2">Salary Package</div>
                                      <div className="text-xs text-slate-600">
                                        <div>Basic: {candidate.salary_proposal.basic_salary}</div>
                                        {candidate.salary_proposal.allowances && candidate.salary_proposal.allowances.length > 0 && (
                                          <div className="mt-1">
                                            {candidate.salary_proposal.allowances.map((allowance: any, index: number) => (
                                              <div key={index}>{allowance.name}: {allowance.amount}</div>
                                            ))}
                                          </div>
                                        )}
                                        <div className="font-semibold mt-1">Total: {candidate.salary_proposal.total_salary}</div>
                                      </div>
                                    </div>
                                  )}

                                  {showResendForm === candidate.candidate_id ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                                      <label className="text-sm font-medium text-slate-700">Resend Verification Link</label>
                                      <input
                                        type="email"
                                        placeholder="Enter new verifier email"
                                        value={resendVerificationEmail[candidate.candidate_id] || ''}
                                        onChange={(e) => setResendVerificationEmail({
                                          ...resendVerificationEmail,
                                          [candidate.candidate_id]: e.target.value
                                        })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleResendVerificationEmail(
                                            candidate.candidate_id,
                                            resendVerificationEmail[candidate.candidate_id] || ''
                                          )}
                                          disabled={processingAction === candidate.candidate_id}
                                          className="flex-1 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                          <Send className="w-4 h-4" />
                                          Send
                                        </button>
                                        <button
                                          onClick={() => {
                                            setShowResendForm(null);
                                            setResendVerificationEmail({
                                              ...resendVerificationEmail,
                                              [candidate.candidate_id]: ''
                                            });
                                          }}
                                          className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setShowResendForm(candidate.candidate_id)}
                                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Resend Verification Link
                                    </button>
                                  )}

                                  <button
                                    onClick={async () => {
                                      if (confirm('Complete verification process?')) {
                                        setProcessingAction(candidate.candidate_id);
                                        try {
                                          await updateCurrentStep(candidate.candidate_id, 'Ready for Recommendation – Hiring Manager 1');
                                          await loadCandidates();
                                          showNotification('Verification completed', 'success');
                                        } catch (error) {
                                          showNotification('Failed to update status', 'error');
                                        } finally {
                                          setProcessingAction(null);
                                        }
                                      }
                                    }}
                                    disabled={processingAction === candidate.candidate_id}
                                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Complete Verification
                                  </button>
                                </div>
                              </div>
                            )}

                            {candidate.approvals?.verifier && (
                              <div className={`rounded-lg p-4 border ${
                                candidate.approvals.verifier.decision === 'Approved' ? 'bg-green-50 border-green-200' :
                                candidate.approvals.verifier.decision === 'Rejected' ? 'bg-red-50 border-red-200' :
                                'bg-amber-50 border-amber-200'
                              }`}>
                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  Verifier Decision
                                </h4>
                                <div className="text-sm space-y-1">
                                  <div>
                                    <span className="font-medium">Decision:</span>{' '}
                                    <span className={`font-semibold ${
                                      candidate.approvals.verifier.decision === 'Approved' ? 'text-green-700' :
                                      candidate.approvals.verifier.decision === 'Rejected' ? 'text-red-700' :
                                      'text-amber-700'
                                    }`}>
                                      {candidate.approvals.verifier.decision}
                                    </span>
                                  </div>
                                  {candidate.approvals.verifier.comment && (
                                    <div>
                                      <span className="font-medium">Comment:</span> {candidate.approvals.verifier.comment}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {candidate.approvals?.verifier && (
                              <RecommendationSection
                                candidate={candidate}
                                onSuccess={() => {
                                  showNotification('Recommendation request sent successfully', 'success');
                                  loadCandidates();
                                }}
                                onError={(message) => showNotification(message, 'error')}
                              />
                            )}

                            {(candidate.current_step?.includes('Ready for Recommendation') || candidate.current_step?.includes('Ready for Approval')) && (
                              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-3">
                                <h4 className="font-semibold text-slate-800 mb-3">{candidate.current_step}</h4>
                                <button
                                  onClick={async () => {
                                    const stepMapping: Record<string, { type: 'hm1' | 'hm2' | 'approver1' | 'approver2', email: string | null, label: string }> = {
                                      'Ready for Recommendation – Hiring Manager 1': { type: 'hm1', email: candidate.hiring_manager1_email, label: 'Hiring Manager 1' },
                                      'Ready for Recommendation – Hiring Manager 2': { type: 'hm2', email: candidate.hiring_manager2_email, label: 'Hiring Manager 2' },
                                      'Ready for Approval – Approver 1': { type: 'approver1', email: candidate.approver1_email, label: 'Approver 1' },
                                      'Ready for Approval – Approver 2': { type: 'approver2', email: candidate.approver2_email, label: 'Approver 2' }
                                    };

                                    const mapping = stepMapping[candidate.current_step];
                                    if (!mapping || !mapping.email) {
                                      showNotification('Email not configured for this step', 'error');
                                      return;
                                    }

                                    if (confirm(`Send request to ${mapping.label} (${mapping.email})?`)) {
                                      setProcessingAction(candidate.candidate_id);
                                      try {
                                        const token = await sendApprovalRequest(candidate, mapping.type, mapping.email);
                                        const baseUrl = getPublicBaseUrl();
                                        const approveUrl = `${baseUrl}/approve?token=${token}&type=${mapping.type}&candidate=${encodeURIComponent(candidate.name)}&position=${encodeURIComponent(candidate.position)}`;

                                        const subject = `${mapping.type.includes('hm') ? 'Recommendation' : 'Approval'} Request - ${candidate.name} (${candidate.position})`;
                                        const body = `Please review and provide your ${mapping.type.includes('hm') ? 'recommendation' : 'decision'} for:\n\nCandidate: ${candidate.name}\nPosition: ${candidate.position}\n\nClick here to respond:\n${approveUrl}\n\nThis link is valid for 7 days.`;

                                        const mailtoLink = `mailto:${mapping.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                        window.open(mailtoLink, '_blank');

                                        await loadCandidates();
                                      } catch (error) {
                                        showNotification('Failed to generate request', 'error');
                                      } finally {
                                        setProcessingAction(null);
                                      }
                                    }
                                  }}
                                  disabled={processingAction === candidate.candidate_id}
                                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Send className="w-4 h-4" />
                                  Send Request Email
                                </button>
                              </div>
                            )}

                            {Object.entries(candidate.approvals || {}).filter(([key]) => ['hm1', 'hm2', 'approver1', 'approver2'].includes(key)).map(([key, approval]: [string, any]) => (
                              <div key={key} className={`rounded-lg p-4 border mt-3 ${
                                approval.decision === 'Recommend' || approval.decision === 'Approved' ? 'bg-green-50 border-green-200' :
                                approval.decision?.includes('Not') || approval.decision === 'Rejected' ? 'bg-red-50 border-red-200' :
                                'bg-amber-50 border-amber-200'
                              }`}>
                                <h4 className="font-semibold text-slate-800 mb-2">
                                  {key === 'hm1' ? 'HM1 Recommendation' : key === 'hm2' ? 'HM2 Recommendation' : key === 'approver1' ? 'Approver 1 Decision' : 'Approver 2 Decision'}
                                </h4>
                                <div className="text-sm space-y-1">
                                  <div><span className="font-medium">Decision:</span> <span className="font-semibold">{approval.decision}</span></div>
                                  {approval.comment && <div><span className="font-medium">Comment:</span> {approval.comment}</div>}
                                  {approval.email && <div className="text-xs text-slate-500">By: {approval.email}</div>}
                                </div>
                              </div>
                            ))}

                            {candidate.current_step === 'Ready for Contract Issuance' && (
                              <div className="bg-green-50 border border-green-300 rounded-lg p-4 mt-3">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                  <FileCheck className="w-5 h-5 text-green-600" />
                                  Phase 10: Ready for Contract Issuance
                                </h4>
                                <p className="text-sm text-slate-700 mb-3">
                                  All approvals complete. Ready to issue contract to candidate.
                                </p>
                                <button
                                  onClick={async () => {
                                    if (confirm('Mark contract as issued?')) {
                                      setProcessingAction(candidate.candidate_id);
                                      try {
                                        await updateCurrentStep(candidate.candidate_id, 'Contract Issued');
                                        await loadCandidates();
                                      } catch (error) {
                                        showNotification('Failed to update status', 'error');
                                      } finally {
                                        setProcessingAction(null);
                                      }
                                    }
                                  }}
                                  disabled={processingAction === candidate.candidate_id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Contract as Issued
                                </button>
                              </div>
                            )}

                            {candidate.current_step === 'Contract Issued' && (
                              <div className="bg-green-100 border border-green-400 rounded-lg p-4 mt-3">
                                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5" />
                                  Contract Issued - Process Complete
                                </h4>
                                <p className="text-sm text-green-700">
                                  Contract has been issued. Hiring process completed successfully!
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {emailPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Assessment Email Draft</h3>
              <button
                onClick={() => setEmailPreview(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-cyan-800">
                    <p className="font-medium mb-1">Preview and verify the email content below</p>
                    <p className="text-cyan-700">Click "Open Draft in Email" to open this email in your default email client. You can review and send it manually.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">From:</span>
                  <span className="text-slate-600">{emailPreview.senderName} &lt;{emailPreview.senderEmail}&gt;</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">To:</span>
                  <span className="text-slate-600">{emailPreview.candidateEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">Subject:</span>
                  <span className="text-slate-600">Online Assessment Invitation - {emailPreview.position}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-6 bg-white">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-lg text-center">
                    <h1 className="text-2xl font-bold">Online Assessment Invitation</h1>
                  </div>

                  <div className="space-y-4 text-slate-700">
                    <p>Dear <strong>{emailPreview.candidateName}</strong>,</p>

                    <p>Congratulations on being selected for the <strong>{emailPreview.position}</strong> position!</p>

                    <p>As the next step in our hiring process, we kindly request you to complete an online assessment.</p>

                    <div className="bg-slate-50 border-l-4 border-cyan-600 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-2">Assessment Details</h3>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Platform:</strong> Found.it Assessments</li>
                        <li><strong>Your Email:</strong> {emailPreview.candidateEmail}</li>
                        <li><strong>Deadline:</strong> 48 hours from receipt of this email</li>
                      </ul>
                    </div>

                    <div className="text-center py-4">
                      <a
                        href="https://assessments-dashboard.foundit.in/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                      >
                        Access Assessment Portal
                      </a>
                    </div>

                    <div className="bg-slate-50 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-2">Instructions</h3>
                      <ol className="space-y-1 text-sm list-decimal list-inside">
                        <li>Click on the "Access Assessment Portal" button above</li>
                        <li>Log in using your email address: <strong>{emailPreview.candidateEmail}</strong></li>
                        <li>Complete all sections of the assessment</li>
                        <li>Submit your responses before the deadline</li>
                      </ol>

                      <h4 className="font-semibold text-slate-800 mt-3 mb-1">Please note:</h4>
                      <ul className="space-y-1 text-sm list-disc list-inside">
                        <li>The assessment should take approximately 45-60 minutes to complete</li>
                        <li>Ensure you have a stable internet connection</li>
                        <li>Complete the assessment in one sitting if possible</li>
                        <li>Contact the recruitment team if you encounter any technical issues</li>
                      </ul>
                    </div>

                    <p>If you have any questions or need assistance, please don't hesitate to reach out to our recruitment team.</p>

                    <p>We look forward to reviewing your assessment results.</p>

                    <p>Best regards,<br /><strong>{emailPreview.senderName}</strong></p>

                    <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
                      This is an automated message from {emailPreview.senderEmail}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setEmailPreview(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Open Draft in Email
              </button>
            </div>
          </div>
        </div>
      )}

      {verificationEmailPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Verification Request Email Draft</h3>
              <button
                onClick={() => setVerificationEmailPreview(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-cyan-800">
                    <p className="font-medium mb-1">Preview and verify the email content below</p>
                    <p className="text-cyan-700">Click "Open Draft in Email" to open this email in your default email client. You can review and send it manually.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">To:</span>
                  <span className="text-slate-600">{verificationEmailPreview.verifierEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-700">Subject:</span>
                  <span className="text-slate-600">Salary Package Verification Required - {verificationEmailPreview.candidateName} ({verificationEmailPreview.position})</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-6 bg-white">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-6 rounded-lg text-center">
                    <h1 className="text-2xl font-bold">Salary Package Verification</h1>
                  </div>

                  <div className="space-y-4 text-slate-700">
                    <p>Dear Verifier,</p>

                    <p>A salary package requires your verification and approval.</p>

                    <div className="bg-slate-50 border-l-4 border-cyan-600 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-2">Candidate Information</h3>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Name:</strong> {verificationEmailPreview.candidateName}</li>
                        <li><strong>Position:</strong> {verificationEmailPreview.position}</li>
                        <li><strong>Recruiter:</strong> {verificationEmailPreview.candidate.recruiter} ({verificationEmailPreview.candidate.recruiter_email})</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-2">Assessment & Background Check</h3>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Assessment Status:</strong> {verificationEmailPreview.candidate.assessment_status}</li>
                        {verificationEmailPreview.candidate.assessment_score && (
                          <li><strong>Assessment Score:</strong> {verificationEmailPreview.candidate.assessment_score}</li>
                        )}
                        <li><strong>Background Check:</strong> {verificationEmailPreview.candidate.background_check_status}</li>
                      </ul>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-3">Proposed Salary Package</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Basic Salary:</span>
                          <span className="font-semibold">{verificationEmailPreview.salaryProposal?.basic_salary || 'N/A'}</span>
                        </div>
                        {verificationEmailPreview.salaryProposal?.allowances && verificationEmailPreview.salaryProposal.allowances.length > 0 && (
                          <div>
                            <div className="font-medium mt-2 mb-1">Allowances:</div>
                            {verificationEmailPreview.salaryProposal.allowances.map((allowance: any, index: number) => (
                              <div key={index} className="flex justify-between pl-4">
                                <span>{allowance.name}:</span>
                                <span className="font-medium">{allowance.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t-2 border-green-400">
                          <span className="font-bold text-base">Total Salary:</span>
                          <span className="font-bold text-lg text-green-700">{verificationEmailPreview.salaryProposal?.total_salary || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-300 p-4 rounded">
                      <h3 className="font-semibold text-slate-800 mb-2">Required Action</h3>
                      <p className="text-sm mb-3">Click the verification link in your email to provide your decision (Approve/Reject/Request Change).</p>
                      <p className="text-sm text-amber-700">The email will contain a secure link that opens a verification page with three decision buttons.</p>
                    </div>

                    <p>If you have any questions, please contact the recruitment team.</p>

                    <p>Best regards,<br /><strong>Talent Acquisition Team</strong></p>

                    <div className="text-xs text-slate-500 pt-4 border-t border-slate-200">
                      The verification link is valid for 7 days and can only be used once.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setVerificationEmailPreview(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVerificationEmail}
                disabled={processingAction === verificationEmailPreview.candidateId}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Open Draft in Email
              </button>
            </div>
          </div>
        </div>
      )}

      <EditCandidateModal
        isOpen={isEditModalOpen}
        candidate={selectedCandidateForEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCandidateForEdit(null);
        }}
        onSubmit={handleUpdateCandidate}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

    </div>
  );
}
