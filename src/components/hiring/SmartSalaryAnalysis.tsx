import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';

interface Allowance {
  name: string;
  amount: string;
}

interface SmartSalaryAnalysisProps {
  basicSalary: string;
  allowances: Allowance[];
  candidateName: string;
  position: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving?: boolean;
}

const SALARY_BANDS: Record<string, { min: number; mid: number; max: number }> = {
  'E2': { min: 34900, mid: 50515, max: 66130 },
  'E3': { min: 28500, mid: 41870, max: 55240 },
  'E4': { min: 18600, mid: 31690, max: 44780 },
  'E5': { min: 14500, mid: 24695, max: 34890 },
  'E6': { min: 11000, mid: 18690, max: 26380 },
  'E7': { min: 7500, mid: 11902, max: 16304 },
  'E8': { min: 6600, mid: 10325, max: 14050 },
  'E9': { min: 3650, mid: 6739, max: 9827 },
  'E10': { min: 2780, mid: 5273, max: 7765 },
  'E11': { min: 1890, mid: 4032, max: 6174 },
  'NE2': { min: 1700, mid: 2711, max: 4100 },
  'NE1': { min: 1700, mid: 2094, max: 3030 },
  'NEG': { min: 1700, mid: 1879, max: 2760 },
};

export default function SmartSalaryAnalysis({
  basicSalary,
  allowances,
  candidateName,
  position,
  onSave,
  onCancel,
  saving = false
}: SmartSalaryAnalysisProps) {
  const [formData, setFormData] = useState({
    basicSalary: basicSalary || '',
    allowances: allowances.length > 0 ? allowances : [],
    jobTitle: position || '',
    positionLevel: '',
    grade: '',
    yearsOfExperience: '',
    lastDrawnSalary: '',
    expectedSalary: '',
    bandMinRM: '',
    bandMidRM: '',
    bandMaxRM: '',
    employerContributionPct: '15'
  });

  const [aiInsight, setAiInsight] = useState('');
  const [generatingInsight, setGeneratingInsight] = useState(false);

  useEffect(() => {
    if (formData.grade && SALARY_BANDS[formData.grade]) {
      const band = SALARY_BANDS[formData.grade];
      setFormData(prev => ({
        ...prev,
        bandMinRM: band.min.toString(),
        bandMidRM: band.mid.toString(),
        bandMaxRM: band.max.toString(),
      }));
    }
  }, [formData.grade]);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const basicSalaryNum = parseNumber(formData.basicSalary);
  const allowancesTotal = formData.allowances.reduce((sum, a) => sum + parseNumber(a.amount), 0);
  const totalSalary = basicSalaryNum + allowancesTotal;
  const allowanceRatio = totalSalary > 0 ? (allowancesTotal / totalSalary) * 100 : 0;
  const employerContributionRM = (totalSalary * parseNumber(formData.employerContributionPct)) / 100;
  const totalCTC = totalSalary + employerContributionRM;

  const bandMinRM = parseNumber(formData.bandMinRM);
  const bandMidRM = parseNumber(formData.bandMidRM);
  const bandMaxRM = parseNumber(formData.bandMaxRM);
  const lastDrawnSalary = parseNumber(formData.lastDrawnSalary);
  const expectedSalary = parseNumber(formData.expectedSalary);

  const salaryIncrement = lastDrawnSalary > 0 ? totalSalary - lastDrawnSalary : 0;
  const salaryIncrementPercentage = lastDrawnSalary > 0 ? ((salaryIncrement / lastDrawnSalary) * 100) : 0;

  const expectedVsProposed = expectedSalary > 0 ? totalSalary - expectedSalary : 0;
  const expectedVsProposedPercentage = expectedSalary > 0 ? ((expectedVsProposed / expectedSalary) * 100) : 0;

  const getSalaryRangeFit = () => {
    if (!bandMinRM || !bandMaxRM) {
      return { label: 'No band data', color: 'bg-slate-100 text-slate-700', borderColor: 'border-slate-300' };
    }

    if (basicSalaryNum < bandMinRM) {
      return { label: 'Below Band', color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' };
    }

    if (basicSalaryNum >= bandMinRM && basicSalaryNum <= bandMidRM) {
      return { label: 'Within Band (Below/Near Midpoint)', color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-300' };
    }

    if (basicSalaryNum > bandMidRM && basicSalaryNum <= bandMaxRM) {
      return { label: 'Within Band (Near Upper Range)', color: 'bg-green-100 text-green-700', borderColor: 'border-green-300' };
    }

    if (basicSalaryNum > bandMaxRM) {
      return { label: 'Above Band', color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' };
    }

    return { label: 'Unknown', color: 'bg-slate-100 text-slate-700', borderColor: 'border-slate-300' };
  };

  const getRiskFlags = () => {
    const flags = [];

    if (bandMaxRM > 0 && basicSalaryNum > bandMaxRM) {
      flags.push('Basic salary above band maximum');
    }

    if (allowanceRatio > 30) {
      flags.push(`Allowance ratio is ${allowanceRatio.toFixed(1)}% (exceeds 30% threshold)`);
    }

    if (lastDrawnSalary > 0 && salaryIncrementPercentage > 30) {
      flags.push(`Salary increment is ${salaryIncrementPercentage.toFixed(1)}% (exceeds 30% threshold)`);
    }

    return flags;
  };

  const generateAIInsight = async () => {
    setGeneratingInsight(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-salary-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          jobTitle: formData.jobTitle,
          yearsOfExperience: formData.yearsOfExperience,
          basicSalary: basicSalaryNum,
          totalSalary: totalSalary,
          lastDrawnSalary: lastDrawnSalary,
          expectedSalary: expectedSalary,
          bandMin: bandMinRM,
          bandMid: bandMidRM,
          bandMax: bandMaxRM,
          totalCTC: totalCTC
        })
      });

      const data = await response.json();
      if (data.insight) {
        setAiInsight(data.insight);
      } else {
        setAiInsight('Unable to generate insight at this time.');
      }
    } catch (error) {
      console.error('Error generating AI insight:', error);
      setAiInsight('Failed to generate insight. Please try again.');
    } finally {
      setGeneratingInsight(false);
    }
  };

  const addAllowance = () => {
    setFormData({
      ...formData,
      allowances: [...formData.allowances, { name: '', amount: '' }]
    });
  };

  const updateAllowance = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...formData.allowances];
    updated[index][field] = value;
    setFormData({ ...formData, allowances: updated });
  };

  const removeAllowance = (index: number) => {
    setFormData({
      ...formData,
      allowances: formData.allowances.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    onSave({
      ...formData,
      totalSalary,
      allowancesTotal,
      allowanceRatio,
      employerContributionRM,
      totalCTC,
      aiInsight
    });
  };

  const salaryRangeFit = getSalaryRangeFit();
  const riskFlags = getRiskFlags();

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            placeholder="e.g., Senior Manager"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Position <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.positionLevel}
            onChange={(e) => setFormData({ ...formData, positionLevel: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          >
            <option value="">Select Position</option>
            <option value="SVP">SVP</option>
            <option value="VP">VP</option>
            <option value="General Manager">General Manager</option>
            <option value="Deputy General Manager">Deputy General Manager</option>
            <option value="Senior Manager">Senior Manager</option>
            <option value="Manager">Manager</option>
            <option value="Deputy Manager">Deputy Manager</option>
            <option value="Senior Executive">Senior Executive</option>
            <option value="Executive">Executive</option>
            <option value="Assistant Executive/Chargeman B0">Assistant Executive/Chargeman B0</option>
            <option value="Technician/Chargeman A0/Secretary">Technician/Chargeman A0/Secretary</option>
            <option value="Clerk">Clerk</option>
            <option value="Driver/Office Assistant">Driver/Office Assistant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Grade <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          >
            <option value="">Select Grade</option>
            <option value="E2">E2</option>
            <option value="E3">E3</option>
            <option value="E4">E4</option>
            <option value="E5">E5</option>
            <option value="E6">E6</option>
            <option value="E7">E7</option>
            <option value="E8">E8</option>
            <option value="E9">E9</option>
            <option value="E10">E10</option>
            <option value="E11">E11</option>
            <option value="NE2">NE2</option>
            <option value="NE1">NE1</option>
            <option value="NEG">NEG</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Years of Experience <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.yearsOfExperience}
            onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
            placeholder="e.g., 5"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          />
        </div>
      </div>

      {/* Last Drawn Salary */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Last Drawn Salary (RM) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.lastDrawnSalary}
          onChange={(e) => setFormData({ ...formData, lastDrawnSalary: e.target.value })}
          placeholder="e.g., 7500 or RM 7,500"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Expected Salary */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Expected Salary (RM) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.expectedSalary}
          onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
          placeholder="e.g., 8500 or RM 8,500"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Salary Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Proposed Basic Salary (RM) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.basicSalary}
          onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
          placeholder="e.g., 8000 or RM 8,000"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Allowances */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Allowances</label>
          <button
            type="button"
            onClick={addAllowance}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors"
          >
            + Add Allowance
          </button>
        </div>

        {formData.allowances.map((allowance, index) => (
          <div key={index} className="flex gap-2 items-start">
            <input
              type="text"
              value={allowance.name}
              onChange={(e) => updateAllowance(index, 'name', e.target.value)}
              placeholder="Allowance name"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <input
              type="text"
              value={allowance.amount}
              onChange={(e) => updateAllowance(index, 'amount', e.target.value)}
              placeholder="Amount"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <button
              type="button"
              onClick={() => removeAllowance(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Total Salary Display */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Total Salary</span>
          <span className="text-xl font-bold text-green-700">
            RM {totalSalary.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Auto-calculated from basic salary and allowances</p>

        {lastDrawnSalary > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Increment from Last Drawn Salary</span>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-700">
                  RM {salaryIncrement.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs font-bold ${
                  salaryIncrementPercentage > 20 ? 'text-orange-600' :
                  salaryIncrementPercentage > 10 ? 'text-green-600' :
                  'text-slate-600'
                }`}>
                  {salaryIncrementPercentage > 0 ? '+' : ''}{salaryIncrementPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {expectedSalary > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Difference from Expected Salary</span>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  expectedVsProposed >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  RM {Math.abs(expectedVsProposed).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs font-bold ${
                  expectedVsProposed >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {expectedVsProposed >= 0 ? 'Above' : 'Below'} by {Math.abs(expectedVsProposedPercentage).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Salary Analysis Card */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-cyan-200 rounded-lg p-5 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-600" />
          Smart Salary Analysis
        </h3>

        {/* Internal Band Fields */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Internal Salary Band</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Band Min (RM)</label>
              <input
                type="text"
                value={formData.bandMinRM}
                readOnly
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Band Mid (RM)</label>
              <input
                type="text"
                value={formData.bandMidRM}
                readOnly
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Band Max (RM)</label>
              <input
                type="text"
                value={formData.bandMaxRM}
                readOnly
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Employer Contribution */}
        <div className="bg-white rounded-lg p-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Employer Contribution (%)</label>
            <input
              type="text"
              value={formData.employerContributionPct}
              onChange={(e) => setFormData({ ...formData, employerContributionPct: e.target.value })}
              placeholder="Default 15%"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
        </div>

        {/* Calculated Outputs */}
        <div className="bg-white rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-slate-800 text-sm mb-3">Calculated Values</h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 p-3 rounded">
              <div className="text-xs text-slate-600 mb-1">Allowances Total</div>
              <div className="font-bold text-slate-800">RM {allowancesTotal.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded">
              <div className="text-xs text-slate-600 mb-1">Allowance Ratio</div>
              <div className="font-bold text-slate-800">{allowanceRatio.toFixed(1)}%</div>
            </div>

            <div className="bg-slate-50 p-3 rounded">
              <div className="text-xs text-slate-600 mb-1">Employer Contribution</div>
              <div className="font-bold text-slate-800">RM {employerContributionRM.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-3 rounded border border-cyan-200">
              <div className="text-xs text-cyan-700 mb-1 font-medium">Total CTC</div>
              <div className="font-bold text-cyan-800 text-lg">RM {totalCTC.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Salary Range Fit */}
        {(bandMinRM > 0 || bandMaxRM > 0) && (
          <div className={`border-2 ${salaryRangeFit.borderColor} ${salaryRangeFit.color} rounded-lg p-4`}>
            <div className="font-semibold text-sm mb-1">Salary Range Fit</div>
            <div className="text-lg font-bold">{salaryRangeFit.label}</div>
          </div>
        )}

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Flags Detected
            </div>
            <ul className="space-y-1">
              {riskFlags.map((flag, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Salary Insight */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-slate-800">AI Salary Insight</h4>
          </div>

          {!aiInsight ? (
            <button
              onClick={generateAIInsight}
              disabled={generatingInsight || !formData.jobTitle || !formData.yearsOfExperience || basicSalaryNum === 0}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingInsight ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Salary Insight (AI)
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 text-sm text-slate-700 leading-relaxed border border-purple-200">
                {aiInsight}
              </div>
              <button
                onClick={() => {
                  setAiInsight('');
                  generateAIInsight();
                }}
                disabled={generatingInsight}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate Insight
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !formData.basicSalary || !formData.jobTitle}
          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Salary Package
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
