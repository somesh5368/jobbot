import React, { useState } from 'react';
import { 
  Building2, MapPin, BadgeIndianRupee, Calendar, 
  ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Clock, FilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function JobCard({ job, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [applying, setApplying] = useState(false);

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      await api.saveJob(job.id);
      toast.success("Job saved to bookmarks");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed saving job card");
    }
  };

  const handleIgnore = async (e) => {
    e.stopPropagation();
    try {
      await api.ignoreJob(job.id);
      toast.success("Job ignored and archived");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed ignoring job");
    }
  };

  const handleApply = async (e) => {
    e.stopPropagation();
    setApplying(true);
    const applyToast = toast.loading("Applying & generating AI prep package...");
    try {
      await api.applyToJob(job.id, { method: 'manual', notes });
      toast.success("Successfully applied! Optimized ATS Resume & Prep Guide generated in background.", {
        id: applyToast,
        duration: 5000
      });
      setIsExpanded(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed submitting application", {
        id: applyToast
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-slate-900/40 backdrop-blur-md transition-all duration-300 ${
      isExpanded ? 'border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'border-slate-800/80 hover:border-slate-700/80'
    }`}>
      
      {/* 1. Header Card Body */}
      <div 
        className="flex cursor-pointer flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-750 text-slate-350 shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-md font-bold text-slate-100">{job.title}</h3>
              {job.job_type && (
                <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-750">
                  {job.job_type}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-400">{job.company}</p>
            
            {/* Quick specifications row */}
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location || 'Remote'}</span>
              <span className="flex items-center gap-1.5"><BadgeIndianRupee className="h-3.5 w-3.5" />{job.stipend_or_salary || 'Not Disclosed'}</span>
              {job.deadline && (
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{job.deadline}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scoring Badges list */}
        <div className="flex items-center gap-3 sm:text-right shrink-0">
          <div className="flex flex-col gap-1.5">
            <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getMatchColor(job.match_score)}`}>
              <CheckCircle className="h-3.5 w-3.5" />
              {job.match_score}% Match
            </span>
            <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${getRiskColor(job.fake_risk_score)}`}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Risk: {job.fake_risk_score}%
            </span>
          </div>
          <div className="text-slate-500">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* 2. Expanded Drawer Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-800 bg-slate-900/10"
          >
            <div className="space-y-5 p-6 text-sm text-slate-300">
              
              {/* Description summary */}
              {job.ai_summary && (
                <div className="rounded-lg bg-indigo-500/5 p-4 border border-indigo-500/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">AI Summary</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-350">{job.ai_summary}</p>
                </div>
              )}

              {/* Match reasons & Skill gaps grids */}
              <div className="grid gap-5 md:grid-cols-2">
                {job.match_reasons && job.match_reasons.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Relevancy Strengths</h4>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-slate-400">
                      {job.match_reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {job.skills_required && job.skills_required.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Skill Gaps detected</h4>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-slate-400">
                      {job.skills_required.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Fake Job details warnings */}
              {job.fake_risk_score >= 40 && job.fake_risk_reasons && job.fake_risk_reasons.length > 0 && (
                <div className="rounded-lg bg-rose-500/5 p-4 border border-rose-500/10 text-xs text-rose-350">
                  <h4 className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-400">
                    <ShieldAlert className="h-4 w-4" />
                    Security Risk Details
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {job.fake_risk_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Job Description text */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Job Description</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-450 whitespace-pre-wrap max-h-48 overflow-y-auto pr-2 bg-slate-950/20 p-3 rounded-lg border border-slate-900 scrollbar-thin">
                  {job.description}
                </p>
              </div>

              {/* Action Operations Panel */}
              <div className="flex flex-col gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                
                {/* Left side actions (ignore, link) */}
                <div className="flex items-center gap-3">
                  <a 
                    href={job.source_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 border border-slate-750 hover:bg-slate-700"
                  >
                    View Original Link
                  </a>
                  {job.status === 'new' && (
                    <>
                      <button 
                        onClick={handleSave}
                        className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold hover:bg-slate-900"
                      >
                        Bookmark
                      </button>
                      <button 
                        onClick={handleIgnore}
                        className="rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 px-4 py-2 rounded-lg"
                      >
                        Ignore
                      </button>
                    </>
                  )}
                </div>

                {/* Apply form trigger */}
                {job.status !== 'applied' ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input 
                      type="text" 
                      placeholder="Add application notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                    <button 
                      onClick={handleApply}
                      disabled={applying}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shrink-0"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {applying ? 'Applying...' : 'Apply & Prep'}
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle className="h-4 w-4" /> Already Applied
                  </span>
                )}

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
