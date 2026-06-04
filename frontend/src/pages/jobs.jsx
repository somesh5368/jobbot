import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import JobCard from '../components/JobCard';
import { api } from '../lib/api';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

export default function JobsFeed() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Query Filters state
  const [status, setStatus] = useState('new');
  const [jobType, setJobType] = useState('');
  const [minMatch, setMinMatch] = useState(0);
  const [maxRisk, setMaxRisk] = useState(100);
  const [page, setPage] = useState(1);
  const limit = 15;

  const loadJobs = async () => {
    setLoading(true);
    try {
      const filters = {
        limit,
        offset: (page - 1) * limit,
        min_match: minMatch,
        max_risk: maxRisk,
      };
      if (status) filters.status = status;
      if (jobType) filters.job_type = jobType;
      
      const res = await api.getJobs(filters);
      setJobs(res.jobs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Failed loading job feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [status, jobType, minMatch, maxRisk, page]);

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Page title */}
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Discovered Opportunities</h2>
          <p className="text-xs text-slate-400">Scraped postings rated for match score and fraud risk.</p>
        </div>

        {/* Filters control block */}
        <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Search Filters</span>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Status</label>
              <select 
                value={status} 
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="new">New Matches</option>
                <option value="saved">Bookmarked</option>
                <option value="applied">Applied</option>
                <option value="ignored">Ignored / Archived</option>
              </select>
            </div>

            {/* Job Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Position Type</label>
              <select 
                value={jobType} 
                onChange={(e) => { setJobType(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="internship">Internships</option>
                <option value="fulltime">Full-Time Jobs</option>
                <option value="remote">Remote Work</option>
              </select>
            </div>

            {/* Min Match Score */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min Match %</label>
              <select 
                value={minMatch} 
                onChange={(e) => { setMinMatch(parseInt(e.target.value)); setPage(1); }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value={0}>Any Match</option>
                <option value={60}>60%+ Match</option>
                <option value={70}>70%+ Match</option>
                <option value={80}>80%+ Match</option>
                <option value={90}>90%+ Match</option>
              </select>
            </div>

            {/* Max Risk Score */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Risk %</label>
              <select 
                value={maxRisk} 
                onChange={(e) => { setMaxRisk(parseInt(e.target.value)); setPage(1); }}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value={100}>Allow All</option>
                <option value={60}>Moderate Risk (&lt;60%)</option>
                <option value={30}>Verified Safe Only (&lt;30%)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Main Job Cards List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Crawling matched directories...
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={loadJobs} />
            ))}
            
            {jobs.length === 0 && (
              <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-12 text-center text-slate-500">
                No matching opportunities found in this query. Trigger a scan from the dashboard to discover more.
              </div>
            )}
            
            {/* Pagination widgets */}
            {total > limit && (
              <div className="flex items-center justify-between border-t border-slate-900 pt-5">
                <span className="text-xs text-slate-500">Page {page} showing {jobs.length} items</span>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-50 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    disabled={jobs.length < limit}
                    onClick={() => setPage(page + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-50 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
