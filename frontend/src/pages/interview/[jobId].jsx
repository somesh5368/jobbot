import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { 
  Compass, ShieldAlert, Award, FileText, CheckCircle2, 
  ChevronRight, RefreshCw, Sparkles, AlertCircle, HelpCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function InterviewPrep() {
  const router = useRouter();
  const { jobId } = router.query;

  const [prep, setPrep] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('technical');
  const [regenerating, setRegenerating] = useState(false);
  
  // Interactive Practice loop state
  const [practiceIndex, setPracticeIndex] = useState(-1);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadPrepDetails = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const jobData = await api.getJob(jobId);
      setJob(jobData);
      
      const res = await api.getInterviewPrep(jobId);
      setPrep(res.prep || null);
    } catch (err) {
      console.error("Failed loading prep details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrepDetails();
  }, [jobId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    const regenToast = toast.loading("Regenerating preparation guide using Claude AI...");
    try {
      const res = await api.regeneratePrep(jobId);
      setPrep(res.prep || null);
      toast.success("Prep guide updated successfully!", { id: regenToast });
    } catch (err) {
      toast.error("Failed to regenerate prep guide", { id: regenToast });
    } finally {
      setRegenerating(false);
    }
  };

  const handleEvaluateSubmit = async (e, type, idx, question) => {
    e.preventDefault();
    if (!userAnswer.trim()) {
      toast.error("Please type your response first");
      return;
    }

    setEvaluating(true);
    const evalToast = toast.loading("Interviewer grading your response...");
    try {
      const res = await api.submitAnswer({
        job_id: jobId,
        question_type: type,
        question_index: idx,
        user_answer: userAnswer
      });
      setFeedback(res.feedback);
      toast.success(`Interviewer rated answer: ${res.feedback.score}/100`, { id: evalToast });
      loadPrepDetails(); // Reload data to persist user_answer/feedback state
    } catch (err) {
      toast.error("Failed to grade practice answer", { id: evalToast });
    } finally {
      setEvaluating(false);
    }
  };

  const selectQuestionForPractice = (idx, currentAnswer, currentFeedback) => {
    setPracticeIndex(idx);
    setUserAnswer(currentAnswer || '');
    setFeedback(currentFeedback || null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Details */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Interview Guided Prep</h2>
            <p className="text-xs text-slate-400">
              Personalized prep guides for {job?.company || 'Loading...'} &bull; {job?.title || ''}.
            </p>
          </div>

          <button 
            onClick={handleRegenerate}
            disabled={regenerating || !jobId}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-350"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate Package
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Compiling interview preparation engines...
          </div>
        ) : !prep ? (
          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-12 text-center text-slate-500">
            Prep guides could not be loaded for this job. Check application status details.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* LEFT COLUMN: Guided Section Tabs (Span 2) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Tab options bar */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-thin border-b border-slate-900">
                {[
                  { key: 'company', label: 'Company Overview' },
                  { key: 'technical', label: 'Technical Qs' },
                  { key: 'hr', label: 'HR & Behavioral' },
                  { key: 'resume', label: 'Resume Hooks' },
                  { key: 'topics', label: 'Revision Resource' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setPracticeIndex(-1); }}
                    className={`rounded-t-lg px-4 py-2.5 border-b-2 transition-all shrink-0 ${
                      activeTab === tab.key 
                        ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 1. Company Overview Tab */}
              {activeTab === 'company' && (
                <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-5 text-xs leading-relaxed text-slate-350">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">Company Research Report</h3>
                    <p className="bg-slate-950/20 p-3.5 rounded-lg border border-slate-900">{prep.company_research}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">Role Expectations Details</h3>
                    <p className="bg-slate-950/20 p-3.5 rounded-lg border border-slate-900">{prep.role_overview}</p>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Estimated Rounds</h3>
                      <p className="text-slate-200 font-semibold">{prep.estimated_rounds} stages</p>
                    </div>
                    {prep.dress_code_tips && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Dress Code Recommendation</h3>
                        <p className="text-slate-200 font-semibold">{prep.dress_code_tips}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Technical Qs Tab */}
              {activeTab === 'technical' && (
                <div className="space-y-4">
                  {(prep.technical_questions || []).map((q, idx) => {
                    const isSelected = practiceIndex === idx;
                    return (
                      <div 
                        key={idx} 
                        className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                          isSelected ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-900 bg-slate-900/20 hover:border-slate-800'
                        }`}
                        onClick={() => selectQuestionForPractice(idx, q.user_answer, q.feedback)}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-200 flex items-start gap-1.5 leading-relaxed">
                            <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                            {q.question}
                          </h4>
                          <span className="rounded bg-slate-950 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border border-slate-850 shrink-0 ml-3">
                            {q.difficulty}
                          </span>
                        </div>
                        {q.feedback && (
                          <div className="mt-3 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Answer Evaluated: {q.feedback.score}/100
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. HR Questions Tab */}
              {activeTab === 'hr' && (
                <div className="space-y-4">
                  {(prep.hr_questions || []).map((q, idx) => {
                    const isSelected = practiceIndex === idx;
                    return (
                      <div 
                        key={idx} 
                        className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                          isSelected ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-900 bg-slate-900/20 hover:border-slate-800'
                        }`}
                        onClick={() => selectQuestionForPractice(idx, q.user_answer, q.feedback)}
                      >
                        <h4 className="text-xs font-bold text-slate-200 flex items-start gap-1.5 leading-relaxed">
                          <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          {q.question}
                        </h4>
                        <p className="mt-2 text-[11px] text-slate-500 leading-normal">
                          💡 Target Objective: {q.what_they_look_for}
                        </p>
                        {q.feedback && (
                          <div className="mt-3 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Answer Evaluated: {q.feedback.score}/100
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. Resume Hooks Tab */}
              {activeTab === 'resume' && (
                <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-5 text-xs leading-relaxed text-slate-350">
                  {prep.project_tips && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1.5">Project Pitching Strategy</h3>
                      <p className="bg-slate-950/20 p-3.5 rounded-lg border border-slate-900">{prep.project_tips}</p>
                    </div>
                  )}

                  {prep.resume_talking_points && prep.resume_talking_points.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Resume Highlight Hooks</h3>
                      <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                        {prep.resume_talking_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prep.dos_and_donts && prep.dos_and_donts.length > 0 && (
                    <div className="grid gap-4 grid-cols-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Do's</h3>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          {prep.dos_and_donts.filter(d => d.toLowerCase().startsWith('do')).map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Don'ts</h3>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          {prep.dos_and_donts.filter(d => d.toLowerCase().startsWith('don') || d.toLowerCase().startsWith('avoid')).map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Revision Resources Tab */}
              {activeTab === 'topics' && (
                <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-5 text-xs leading-relaxed text-slate-350">
                  {prep.coding_topics && prep.coding_topics.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Revision Coding Sub-Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {prep.coding_topics.map((t, i) => (
                          <span key={i} className="rounded bg-slate-950 px-2.5 py-1 text-slate-300 border border-slate-850">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {prep.prep_resources && prep.prep_resources.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Free Learning & Practice Links</h3>
                      <div className="space-y-2">
                        {prep.prep_resources.map((res, i) => (
                          <a 
                            key={i} 
                            href={res.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded border border-slate-900 text-slate-300 hover:border-slate-800 transition-colors"
                          >
                            <span>{res.title} &bull; <span className="text-[10px] text-slate-550 uppercase font-bold">{res.type}</span></span>
                            <ChevronRight className="h-4 w-4 text-slate-650" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: Graded Answer Sandbox Console */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md text-xs text-slate-300">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Interactive Practice sandbox</h3>
                </div>

                {practiceIndex === -1 ? (
                  <div className="py-12 text-center text-slate-600 italic">
                    Select a practice question from the list on the left to start typing your answer and get graded.
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Active Question Box */}
                    <div className="rounded-lg bg-slate-950/40 p-3 border border-slate-900 text-slate-200">
                      <p className="font-semibold leading-relaxed">
                        Q: {
                          activeTab === 'technical' 
                            ? prep.technical_questions[practiceIndex]?.question 
                            : prep.hr_questions[practiceIndex]?.question
                        }
                      </p>
                    </div>

                    {/* Hint */}
                    <div className="text-[11px] text-indigo-400">
                      💡 Hint: {
                        activeTab === 'technical' 
                          ? prep.technical_questions[practiceIndex]?.hint 
                          : prep.hr_questions[practiceIndex]?.hint
                      }
                    </div>

                    {/* Input response form */}
                    <form 
                      onSubmit={(e) => handleEvaluateSubmit(
                        e, 
                        activeTab, 
                        practiceIndex, 
                        activeTab === 'technical' ? prep.technical_questions[practiceIndex] : prep.hr_questions[practiceIndex]
                      )} 
                      className="space-y-3"
                    >
                      <textarea 
                        placeholder="Type your response to the interviewer here..."
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        rows={6}
                        required
                      />
                      
                      <button 
                        type="submit"
                        disabled={evaluating || !userAnswer.trim()}
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 text-xs disabled:opacity-50"
                      >
                        {evaluating ? 'Grading Response...' : 'Submit to Interviewer'}
                      </button>
                    </form>

                    {/* Grader Feedback Result details */}
                    {feedback && (
                      <div className="mt-4 border-t border-slate-900 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-350">Practice score:</span>
                          <span className={`text-md font-extrabold px-3 py-0.5 rounded ${
                            feedback.score >= 80 ? 'text-emerald-400 bg-emerald-500/10' : feedback.score >= 60 ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {feedback.score}/100
                          </span>
                        </div>

                        {feedback.strengths && feedback.strengths.length > 0 && (
                          <div>
                            <p className="font-bold text-emerald-400 text-[10px] uppercase">Strengths</p>
                            <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-400 space-y-0.5">
                              {feedback.strengths.map((st, i) => <li key={i}>{st}</li>)}
                            </ul>
                          </div>
                        )}

                        {feedback.improvement_tips && feedback.improvement_tips.length > 0 && (
                          <div>
                            <p className="font-bold text-amber-400 text-[10px] uppercase">Improvement Areas</p>
                            <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-400 space-y-0.5">
                              {feedback.improvement_tips.map((tip, i) => <li key={i}>{tip}</li>)}
                            </ul>
                          </div>
                        )}

                        {feedback.suggested_phrasing && (
                          <div className="rounded bg-slate-950 p-2.5 border border-slate-900 text-[11px] leading-relaxed">
                            <span className="font-bold text-indigo-400 block mb-0.5">Suggested Phrasing:</span>
                            {feedback.suggested_phrasing}
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
