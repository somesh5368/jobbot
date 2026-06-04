import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ApplicationCard from '../components/ApplicationCard';
import { api } from '../lib/api';
import { Layers, CalendarClock, Briefcase } from 'lucide-react';

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await api.getApplications();
      setApps(res.applications || []);
    } catch (err) {
      console.error("Failed loading applications tracker list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const filteredApps = apps.filter(app => {
    if (filter === 'all') return true;
    if (filter === 'interview') return app.application_status === 'interview_scheduled';
    if (filter === 'offers') return app.application_status === 'offered';
    if (filter === 'active') return ['applied', 'shortlisted', 'interview_scheduled'].includes(app.application_status);
    return app.application_status === filter;
  });

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Details */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100">My Applications Tracker</h2>
            <p className="text-xs text-slate-400">Manage ongoing applications, follow-ups, and prep checklists.</p>
          </div>
          
          {/* Quick tab controls */}
          <div className="flex gap-1.5 rounded-lg bg-slate-900 border border-slate-800 p-1 text-xs font-semibold">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'interview', label: 'Interviews' },
              { key: 'offers', label: 'Offers' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded px-3 py-1.5 transition-all ${
                  filter === tab.key 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listings view */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Compiling application states...
          </div>
        ) : (
          <div className="space-y-5">
            {filteredApps.map((app) => (
              <ApplicationCard key={app.id} app={app} onRefresh={loadApplications} />
            ))}
            
            {filteredApps.length === 0 && (
              <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-12 text-center text-slate-500">
                <Briefcase className="mx-auto h-8 w-8 text-slate-700 mb-3" />
                No applications found matching the selected filter.
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
