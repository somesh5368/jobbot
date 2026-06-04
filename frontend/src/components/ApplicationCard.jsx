import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Briefcase, Calendar, Info, MailCheck, Download, 
  ExternalLink, FileText, CheckCircle, Clock, AlertTriangle, PenSquare, Check
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const STATUS_STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview_scheduled', label: 'Interview' },
  { key: 'offered', label: 'Offer' }
];

export default function ApplicationCard({ app, onRefresh }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [status, setStatus] = useState(app.application_status);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  
  const job = app.job || {};
  
  // Calculate if follow-up is eligible (applied > 7 days ago and still marked 'applied')
  const appliedDate = new Date(app.applied_date);
  const diffDays = Math.floor((new Date() - appliedDate) / (1000 * 60 * 60 * 24));
  const isEligibleForFollowUp = diffDays >= 7 && app.application_status === 'applied' && !app.follow_up_sent;

  // Resolve status indices
  const getStepIndex = (statusKey) => {
    if (statusKey === 'rejected') return -1; // Special case
    if (statusKey === 'withdrawn' || statusKey === 'ghosted') return -2;
    return STATUS_STEPS.findIndex(s => s.key === statusKey);
  };

  const currentStepIndex = getStepIndex(status);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateApp(app.id, { application_status: newStatus });
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.updateApp(app.id, { notes });
      setIsEditingNotes(false);
      toast.success("Notes saved successfully");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleFollowUpTrigger = async () => {
    setFollowUpLoading(true);
    const followToast = toast.loading("Composing follow-up draft using Claude...");
    try {
      const res = await api.triggerFollowUp(app.id);
      toast.success("Follow-up email alert dispatched to your inbox! Draft preview copied to clipboard.", {
        id: followToast,
        duration: 5000
      });
      // Copy draft to clipboard
      if (res.draft_message) {
        navigator.clipboard.writeText(res.draft_message);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed dispatching follow-up reminder email", { id: followToast });
    } finally {
      setFollowUpLoading(false);
    }
  };

  const downloadATSResume = async () => {
    try {
      const linkRes = await api.generateATSResume(job.id);
      // Wait, let's fetch versions to get signed URL
      const versionsRes = await api.getResumeVersions();
      const jobVersion = versionsRes.versions?.find(v => v.job_id === job.id);
      if (jobVersion?.download_url) {
        window.open(jobVersion.download_url, '_blank');
      } else {
        toast.error("ATS resume download link missing. Try generating it again.");
      }
    } catch (err) {
      toast.error("Failed to download ATS resume");
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md">
      
      {/* 1. Header Details Block */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-750 text-indigo-400 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-100">{job.title}</h3>
            <p className="text-sm text-slate-400 font-medium">{job.company}</p>
            <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Applied: {app.applied_date} ({diffDays}d ago)</span>
              <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                Method: {capitalize(app.applied_method)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick status picker */}
          <select 
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview</option>
            <option value="offered">Offered</option>
            <option value="rejected">Rejected</option>
            <option value="ghosted">Ghosted</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          
          <button 
            onClick={downloadATSResume}
            className="flex items-center gap-1.5 rounded-lg bg-slate-850 border border-slate-800 hover:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            ATS CV
          </button>
          
          <Link 
            href={`/interview/${job.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Prep Guide
          </Link>
        </div>
      </div>

      {/* 2. Visual Pipeline Stepper */}
      {status !== 'rejected' && status !== 'ghosted' && status !== 'withdrawn' ? (
        <div className="my-8">
          <div className="relative flex items-center justify-between">
            {/* Background Line */}
            <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-800"></div>
            {/* Active Progress Line */}
            <div 
              className="absolute left-0 top-1/2 h-0.5 bg-indigo-500 -translate-y-1/2 transition-all duration-300"
              style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0}%` }}
            ></div>
            
            {/* Steps */}
            {STATUS_STEPS.map((step, idx) => {
              const isPassed = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${
                    isPassed 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {isPassed && idx < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-current"></div>}
                  </div>
                  <span className={`absolute top-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-indigo-400' : isPassed ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="my-8 rounded-lg bg-rose-500/5 border border-rose-500/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <div>
            <p className="text-xs font-bold text-rose-400 capitalize">Application Status: {status}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">This application has been closed or marked inactive.</p>
          </div>
        </div>
      )}

      {/* Spacer for steps labels */}
      {status !== 'rejected' && status !== 'ghosted' && status !== 'withdrawn' && <div className="h-4"></div>}

      {/* 3. Follow-up Alert triggers */}
      {isEligibleForFollowUp && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-amber-500/5 border border-amber-500/10 p-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-amber-400">Application Stalled (7+ Days)</p>
              <p className="text-[11px] text-slate-400">It's time to send a follow-up inquiry letter to recruiters.</p>
            </div>
          </div>
          <button 
            onClick={handleFollowUpTrigger}
            disabled={followUpLoading}
            className="rounded-lg bg-amber-500 text-slate-950 font-bold px-4 py-1.5 text-xs hover:bg-amber-400 disabled:opacity-50"
          >
            {followUpLoading ? 'Composing...' : 'Send Follow-up Draft'}
          </button>
        </div>
      )}
      
      {app.follow_up_sent && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <MailCheck className="h-4 w-4 text-emerald-400" /> Follow-up reminder alert successfully logged.
        </div>
      )}

      {/* 4. Notes Panel */}
      <div className="mt-5 border-t border-slate-900 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</h4>
          {!isEditingNotes ? (
            <button 
              onClick={() => setIsEditingNotes(true)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-350 text-xs"
            >
              <PenSquare className="h-3 w-3" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs font-bold text-indigo-400"
              >
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => { setIsEditingNotes(false); setNotes(app.notes || ''); }}
                className="text-xs text-slate-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {!isEditingNotes ? (
          <p className="text-xs text-slate-450 leading-relaxed italic bg-slate-950/10 p-3 rounded-lg border border-slate-900/60">
            {notes || "No notes written for this application. Click Edit to add interview rounds, contacts, or schedules."}
          </p>
        ) : (
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            rows={3}
            placeholder="Add HR email, online test link, or round dates..."
          />
        )}
      </div>

    </div>
  );
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
