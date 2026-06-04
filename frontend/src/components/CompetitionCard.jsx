import React, { useState } from 'react';
import { 
  Trophy, Calendar, Users, Globe, ExternalLink, checkCircle, Check
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function CompetitionCard({ comp, onRefresh }) {
  const [status, setStatus] = useState(comp.registration_status);
  const [loading, setLoading] = useState(false);

  const getRelevanceColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await api.registerCompetition(comp.id);
      setStatus('registered');
      toast.success("Successfully registered for competition");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to register competition status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all duration-300">
      
      {/* 1. Card Top Details */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-750 text-amber-400 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-md font-bold text-slate-100">{comp.title}</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-750">
                {comp.competition_type}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">{comp.organizer}</p>
          </div>
        </div>

        {/* Relevance Badge */}
        <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shrink-0 ${getRelevanceColor(comp.relevance_score)}`}>
          🔥 {comp.relevance_score}% Relevance
        </span>
      </div>

      {/* 2. Parameters Grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-slate-950/20 p-4 border border-slate-900/60 text-xs md:grid-cols-4">
        <div>
          <p className="text-slate-500">🎁 Prizes</p>
          <p className="mt-1 font-semibold text-slate-200 truncate" title={comp.prizes}>{comp.prizes || 'Not Disclosed'}</p>
        </div>
        <div>
          <p className="text-slate-500">📅 Deadline</p>
          <p className="mt-1 font-semibold text-slate-200">{comp.registration_deadline || 'N/A'}</p>
        </div>
        <div>
          <p className="text-slate-500">👥 Team Size</p>
          <p className="mt-1 font-semibold text-slate-200">{comp.team_size || 'Open'}</p>
        </div>
        <div>
          <p className="text-slate-500">🌐 Format</p>
          <p className="mt-1 font-semibold text-slate-200">{comp.is_online ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Domains chips */}
      {comp.domains && comp.domains.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {comp.domains.map((dom, i) => (
            <span key={i} className="rounded bg-slate-900 px-2.5 py-0.5 text-[10px] text-slate-400 border border-slate-800">
              {dom}
            </span>
          ))}
        </div>
      )}

      {/* 3. Description Snippet */}
      {comp.description && (
        <p className="mt-4 text-xs leading-relaxed text-slate-400 line-clamp-2">
          {comp.description}
        </p>
      )}

      {/* 4. Operations Row */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-900 pt-4">
        <a 
          href={comp.source_url} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-1 text-slate-500 hover:text-slate-350 text-xs font-bold"
        >
          View Contest Page <ExternalLink className="h-3 w-3" />
        </a>
        
        {status === 'registered' ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
            <Check className="h-3.5 w-3.5" /> Registered
          </span>
        ) : (
          <button 
            onClick={handleRegister}
            disabled={loading}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 text-xs disabled:opacity-50"
          >
            {loading ? 'Logging...' : 'Mark Registered'}
          </button>
        )}
      </div>

    </div>
  );
}
