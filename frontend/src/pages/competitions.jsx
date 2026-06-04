import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import CompetitionCard from '../components/CompetitionCard';
import { api } from '../lib/api';
import { Trophy, Compass, Landmark, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Competitions() {
  const [comps, setComps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [status, setStatus] = useState('upcoming');
  const [domain, setDomain] = useState('');
  const [compType, setCompType] = useState('');

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const filters = { upcoming_only: status === 'upcoming' };
      if (status && status !== 'all' && status !== 'upcoming') filters.status = status;
      if (domain) filters.domain = domain;
      if (compType) filters.competition_type = compType;

      const res = await api.getCompetitions(filters);
      setComps(res || []);
      
      const statsData = await api.getCompStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed loading competitions feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, [status, domain, compType]);

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Details */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Hackathon & Coding Tracker</h2>
            <p className="text-xs text-slate-400">Scraped opportunities from Devfolio, Unstop, and LeetCode contests rated for relevance.</p>
          </div>
        </div>

        {/* Telemetry stats cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upcoming Contests</span>
              <p className="mt-1 text-2xl font-bold text-slate-200">{stats.upcoming}</p>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Registered</span>
              <p className="mt-1 text-2xl font-bold text-amber-400">{stats.registered}</p>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Participated</span>
              <p className="mt-1 text-2xl font-bold text-indigo-400">{stats.participated}</p>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-4 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contests Won</span>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.won}</p>
            </div>
          </div>
        )}

        {/* Filters control block */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Search Filters</span>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tracking Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="upcoming">Upcoming Deadlines</option>
                <option value="registered">Registered</option>
                <option value="participated">Participated</option>
                <option value="won">Won / Placed</option>
                <option value="all">Display All</option>
              </select>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Challenge Type</label>
              <select 
                value={compType} 
                onChange={(e) => setCompType(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Challenges</option>
                <option value="hackathon">Hackathons</option>
                <option value="coding_contest">Coding Contests</option>
                <option value="case_study">Case Studies / Quizzes</option>
              </select>
            </div>

            {/* Domain tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Domain Match</label>
              <select 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Domains</option>
                <option value="AI">Artificial Intelligence (AI)</option>
                <option value="ML">Machine Learning (ML)</option>
                <option value="Web Dev">Web Development</option>
                <option value="Blockchain">Blockchain</option>
              </select>
            </div>

          </div>
        </div>

        {/* Listings grids */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Crawling challenge directories...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {comps.map((comp) => (
              <CompetitionCard key={comp.id} comp={comp} onRefresh={loadCompetitions} />
            ))}
            
            {comps.length === 0 && (
              <div className="col-span-2 rounded-xl border border-slate-900 bg-slate-900/10 p-12 text-center text-slate-500">
                <Trophy className="mx-auto h-8 w-8 text-slate-700 mb-3" />
                No competitions found matching filters. Scrape hackathons from the Telemetry dashboard.
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
