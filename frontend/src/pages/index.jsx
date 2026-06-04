import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatsBar from '../components/StatsBar';
import { api } from '../lib/api';
import { RefreshCw, Play, Mail, FileClock, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJobs, setTriggeringJobs] = useState(false);
  const [triggeringComps, setTriggeringComps] = useState(false);

  const loadDashboardData = async () => {
    try {
      const statsData = await api.getApplications(); // To refresh layouts indirectly
      const statsDetail = await api.getAppStats();
      setStats(statsDetail);
      
      const logData = await api.getScraperLogs();
      setLogs(logData.logs || []);
      
      const emailData = await api.getEmailLogs();
      setEmails(emailData.logs || []);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleScanJobs = async () => {
    setTriggeringJobs(true);
    const scanToast = toast.loading("Jobbot searching & scoring new listings...");
    try {
      await api.triggerScrape();
      toast.success("Scrape cycle successfully started in background. Refresh in 1 minute.", { id: scanToast });
      setTimeout(loadDashboardData, 3000); // Reload log list
    } catch (err) {
      toast.error("Failed to initiate scraper scan", { id: scanToast });
    } finally {
      setTriggeringJobs(false);
    }
  };

  const handleScanCompetitions = async () => {
    setTriggeringComps(true);
    const scanToast = toast.loading("Jobbot searching & scoring competitions...");
    try {
      await api.triggerCompScrape();
      toast.success("Competition scrape successfully triggered. Refresh in 1 minute.", { id: scanToast });
      setTimeout(loadDashboardData, 3000);
    } catch (err) {
      toast.error("Failed to trigger competition scan", { id: scanToast });
    } finally {
      setTriggeringComps(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* 1. Header controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Telemetry Cockpit</h2>
            <p className="text-xs text-slate-400">Automated job hunting and competition matching status summary.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleScanCompetitions}
              disabled={triggeringComps}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-350"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${triggeringComps ? 'animate-spin' : ''}`} />
              Scan Contests
            </button>
            <button 
              onClick={handleScanJobs}
              disabled={triggeringJobs}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 text-xs shadow-lg shadow-indigo-600/20"
            >
              <Play className="h-3.5 w-3.5" />
              {triggeringJobs ? 'Scanning...' : 'Scan Jobs Now'}
            </button>
          </div>
        </div>

        {/* 2. Visual Charts widgets */}
        {loading ? (
          <div className="flex h-48 w-full items-center justify-center text-xs text-slate-500">
            Compiling statistics telemetry...
          </div>
        ) : (
          <StatsBar stats={stats} />
        )}

        {/* 3. Auditing Logs Section */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Left: Scraper Runs */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <FileClock className="h-4.5 w-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Scraping Audits</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-550 font-semibold">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Found</th>
                    <th className="py-2.5">New</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950/40 text-slate-400">
                  {logs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 font-medium">
                        {new Date(log.started_at).toLocaleDateString([], {day:'2-digit', month:'short'})} - {new Date(log.started_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-2.5 text-slate-200">{log.jobs_found}</td>
                      <td className="py-2.5 text-indigo-400 font-semibold">{log.jobs_new}</td>
                      <td className="py-2.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Complete
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-650">No scrape audits recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Email log lists */}
          <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Email Delivery Logs</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-550 font-semibold">
                    <th className="py-2.5">Sent At</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950/40 text-slate-400">
                  {emails.slice(0, 5).map((mail) => (
                    <tr key={mail.id} title={mail.subject}>
                      <td className="py-2.5 font-medium">
                        {new Date(mail.sent_at).toLocaleDateString([], {day:'2-digit', month:'short'})} - {new Date(mail.sent_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-2.5 text-slate-200 capitalize">{mail.email_type.replace('_', ' ')}</td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          mail.status === 'sent' 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                        }`}>
                          {mail.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {emails.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-650">No email records logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
