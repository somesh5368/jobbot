"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  BriefcaseIcon, SearchIcon, BellIcon, SettingsIcon, UserIcon,
  ShieldCheckIcon, ShieldXIcon, AlertTriangleIcon, RefreshCwIcon,
  ExternalLinkIcon, CheckCircleIcon, ClockIcon, TrendingUpIcon,
  BookOpenIcon, BarChart2Icon, ZapIcon, PlayIcon, FilterIcon,
  ChevronDownIcon, StarIcon, BuildingIcon, MapPinIcon, DollarSignIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Helpers ────────────────────────────────────────────────────────────────
const riskColor = (score) => {
  if (score < 30) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: "Safe" };
  if (score < 60) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", label: "Check" };
  return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: "Risky" };
};

const matchColor = (score) => {
  if (score >= 80) return "text-violet-400";
  if (score >= 60) return "text-sky-400";
  return "text-slate-400";
};

const sourceEmoji = {
  internshala: "🎓", naukri: "💼", linkedin: "🔗", ncs_portal: "🏛️",
  unstop: "🏆", aicte: "🎓", drdo: "🔬", iit: "🏛️", wellfound: "🚀",
};

// ─── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ job, onApply }) {
  const risk = riskColor(job.fake_risk_score || 0);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`group relative bg-slate-800/60 border ${risk.border} rounded-2xl p-5 hover:bg-slate-800 transition-all duration-200 hover:shadow-lg hover:shadow-violet-900/10`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{sourceEmoji[job.source] || "📋"}</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{job.source?.replace("_", " ")}</span>
            {job.is_govt && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">🏛 Govt</span>
            )}
          </div>
          <h3 className="font-semibold text-slate-100 text-base leading-tight truncate">{job.title}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{job.company}</p>
        </div>
        {/* Match Score Ring */}
        <div className="flex-shrink-0 text-center">
          <div className={`text-2xl font-bold ${matchColor(job.match_score || 0)}`}>{job.match_score || 0}%</div>
          <div className="text-xs text-slate-500">match</div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/60 px-2.5 py-1 rounded-lg">
          <MapPinIcon size={11} /> {job.location || "Remote"}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/60 px-2.5 py-1 rounded-lg">
          <DollarSignIcon size={11} /> {job.stipend || "N/A"}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/60 px-2.5 py-1 rounded-lg">
          {job.work_mode || "onsite"}
        </span>
        <span className={`flex items-center gap-1 text-xs ${risk.text} ${risk.bg} border ${risk.border} px-2.5 py-1 rounded-lg font-medium`}>
          {job.fake_risk_score < 30 ? <ShieldCheckIcon size={11} /> : <AlertTriangleIcon size={11} />}
          {risk.label} ({job.fake_risk_score || 0})
        </span>
      </div>

      {/* Description toggle */}
      {job.description && (
        <div className="mb-3">
          <p className={`text-xs text-slate-500 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {job.description}
          </p>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-violet-400 hover:text-violet-300 mt-1">
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onApply(job)}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2 rounded-xl transition-colors"
        >
          Apply Now <ExternalLinkIcon size={13} />
        </a>
      </div>
    </div>
  );
}

// ─── Stats Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "violet" }) {
  const colors = {
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className={`bg-slate-800/60 border ${colors[color].split(" ")[2]} rounded-2xl p-5 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl border ${colors[color]}`}>
        <Icon size={20} className={colors[color].split(" ")[0]} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Profile Setup Modal ─────────────────────────────────────────────────────
function ProfileModal({ onSave, onClose, existing }) {
  const [form, setForm] = useState({
    name: existing?.name || "Somesh Pandey",
    email: existing?.email || "",
    preferred_roles: existing?.preferred_roles?.join(", ") || "machine learning, python developer, data science, ai engineer",
    preferred_locations: existing?.preferred_locations?.join(", ") || "Remote, Lucknow, Delhi, Bangalore",
    work_mode: existing?.work_mode || "any",
    min_stipend: existing?.min_stipend || 0,
    auto_apply: existing?.auto_apply || false,
    auto_apply_threshold: existing?.auto_apply_threshold || 85,
    email_alerts: existing?.email_alerts !== false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.email) return toast.error("Email is required!");
    setSaving(true);
    try {
      await axios.post(`${API}/api/profile/`, {
        ...form,
        preferred_roles: form.preferred_roles.split(",").map(s => s.trim()).filter(Boolean),
        preferred_locations: form.preferred_locations.split(",").map(s => s.trim()).filter(Boolean),
        min_stipend: parseInt(form.min_stipend) || 0,
      });
      toast.success("Profile saved!");
      onSave();
    } catch (e) {
      toast.error("Failed to save profile");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-100 mb-5">⚙️ Your Profile</h2>
        <div className="space-y-4">
          {[
            { label: "Full Name", key: "name", type: "text" },
            { label: "Email (for alerts)", key: "email", type: "email" },
            { label: "Target Roles (comma separated)", key: "preferred_roles", type: "text" },
            { label: "Preferred Locations (comma separated)", key: "preferred_locations", type: "text" },
            { label: "Min Stipend (₹/month)", key: "min_stipend", type: "number" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-sm text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Work Mode Preference</label>
            <select
              value={form.work_mode}
              onChange={e => setForm(f => ({ ...f, work_mode: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500"
            >
              {["any", "remote", "hybrid", "onsite"].map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-300">Email Alerts</span>
            <button
              onClick={() => setForm(f => ({ ...f, email_alerts: !f.email_alerts }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.email_alerts ? "bg-violet-600" : "bg-slate-600"}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.email_alerts ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-300">Auto-Apply (≥{form.auto_apply_threshold}% match)</span>
            <button
              onClick={() => setForm(f => ({ ...f, auto_apply: !f.auto_apply }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.auto_apply ? "bg-violet-600" : "bg-slate-600"}`}
            >
              <span className={`block w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.auto_apply ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {form.auto_apply && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Auto-Apply Threshold: {form.auto_apply_threshold}%</label>
              <input
                type="range" min="70" max="95" step="5"
                value={form.auto_apply_threshold}
                onChange={e => setForm(f => ({ ...f, auto_apply_threshold: parseInt(e.target.value) }))}
                className="w-full accent-violet-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Applications Tab ─────────────────────────────────────────────────────────
function ApplicationsTab() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/applications/`).then(r => {
      setApps(r.data.applications || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusColors = {
    applied: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    viewed: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    interview: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    selected: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    rejected: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  const updateStatus = async (appId, status) => {
    await axios.patch(`${API}/api/applications/${appId}`, { status });
    setApps(a => a.map(app => app.id === appId ? { ...app, status } : app));
    toast.success(`Status updated to ${status}`);
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading applications...</div>;

  return (
    <div className="space-y-4">
      {apps.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <BriefcaseIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p>No applications yet. Start applying!</p>
        </div>
      ) : apps.map(app => (
        <div key={app.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-100">{app.jobs?.title || "Job"}</h3>
              <p className="text-slate-400 text-sm">{app.jobs?.company}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs border px-2.5 py-1 rounded-full font-medium ${statusColors[app.status] || statusColors.applied}`}>
                  {app.status}
                </span>
                {app.is_auto_applied && <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">🤖 Auto</span>}
                <span className="text-xs text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
            <select
              value={app.status}
              onChange={e => updateStatus(app.id, e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            >
              {["applied", "viewed", "interview", "selected", "rejected"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function JobBotDashboard() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState("feed");
  const [showProfile, setShowProfile] = useState(false);
  const [filter, setFilter] = useState({ type: "", min_match: 0, max_risk: 100 });
  const [resumeFile, setResumeFile] = useState(null);
  const [backendOk, setBackendOk] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const opts = { timeout: 90000 };
    const params = { min_match: filter.min_match, max_risk: filter.max_risk, type: filter.type || undefined };
    const [jobsRes, statsRes, profileRes] = await Promise.allSettled([
      axios.get(`${API}/api/jobs/`, { params, ...opts }),
      axios.get(`${API}/api/jobs/stats`, opts),
      axios.get(`${API}/api/profile/`, opts),
    ]);

    const jobsOk = jobsRes.status === "fulfilled";
    const statsOk = statsRes.status === "fulfilled";
    const profileOk = profileRes.status === "fulfilled";
    setBackendOk(jobsOk && statsOk);

    if (jobsOk) setJobs(jobsRes.value.data.jobs || []);
    if (statsOk) setStats(statsRes.value.data || {});
    if (profileOk) setProfile(profileRes.value.data.profile);

    if (!jobsOk && !statsOk) {
      toast.error("Backend not reachable. Open Render URL first (cold start ~30s), then refresh.");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      await axios.post(`${API}/api/scraper/trigger`);
      toast.success("🔍 Scan started! Wait 60–90s (first run can be slow on free Render).");
      setTimeout(fetchAll, 15000);
      setTimeout(fetchAll, 60000);
    } catch {
      toast.error("Trigger failed — is backend running?");
    }
    setScanning(false);
  };

  const handleApply = async (job) => {
    try {
      await axios.post(`${API}/api/applications/`, { job_id: job.id });
      toast.success("✅ Marked as applied!");
    } catch { /* ignore */ }
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    const form = new FormData();
    form.append("file", resumeFile);
    try {
      const res = await axios.post(`${API}/api/profile/resume`, form);
      toast.success(`📄 Resume uploaded! ${res.data.skill_count} skills extracted.`);
      fetchAll();
    } catch {
      toast.error("Resume upload failed");
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155" }
      }} />

      {showProfile && (
        <ProfileModal existing={profile} onSave={() => { setShowProfile(false); fetchAll(); }} onClose={() => setShowProfile(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-lg">🤖</div>
            <div>
              <span className="font-bold text-slate-100">JobBot AI</span>
              <span className="ml-2 text-xs text-slate-500">24/7 active</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCwIcon size={14} className={scanning ? "animate-spin" : ""} />
              {scanning ? "Scanning..." : "Scan Now"}
            </button>
            <button onClick={() => setShowProfile(true)} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors">
              <UserIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!backendOk && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Backend not connected. Visit{" "}
            <a href={API} target="_blank" rel="noreferrer" className="underline text-amber-100">{API}</a>
            {" "}once to wake Render, then refresh this page.
          </div>
        )}
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={BriefcaseIcon} label="Total Listings" value={stats.total_jobs || 0} color="violet" />
          <StatCard icon={ShieldCheckIcon} label="Verified Safe" value={stats.safe_jobs || 0} color="emerald" />
          <StatCard icon={TrendingUpIcon} label="High Match (80%+)" value={stats.high_match || 0} color="sky" />
          <StatCard icon={CheckCircleIcon} label="Applied" value={stats.total_applied || 0} sub={`${stats.auto_applied || 0} auto`} color="amber" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-2xl mb-6 overflow-x-auto">
          {[
            { id: "feed", label: "Job Feed", icon: BriefcaseIcon },
            { id: "govt", label: "Govt Schemes", icon: BuildingIcon },
            { id: "applied", label: "My Applications", icon: CheckCircleIcon },
            { id: "resume", label: "Resume Setup", icon: BookOpenIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === id ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* Job Feed Tab */}
        {tab === "feed" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <select
                value={filter.type}
                onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
              >
                <option value="">All Types</option>
                <option value="internship">Internships</option>
                <option value="job">Jobs</option>
              </select>
              <select
                value={filter.min_match}
                onChange={e => setFilter(f => ({ ...f, min_match: parseInt(e.target.value) }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
              >
                <option value={0}>All Matches</option>
                <option value={60}>60%+ Match</option>
                <option value={75}>75%+ Match</option>
                <option value={85}>85%+ Match</option>
              </select>
              <select
                value={filter.max_risk}
                onChange={e => setFilter(f => ({ ...f, max_risk: parseInt(e.target.value) }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
              >
                <option value={100}>All Risk Levels</option>
                <option value={30}>✅ Safe Only</option>
                <option value={60}>⚠️ Up to Medium</option>
              </select>
              <span className="ml-auto text-sm text-slate-500 self-center">{sortedJobs.length} listings</span>
            </div>

            {loading ? (
              <div className="text-center py-20 text-slate-500">
                <RefreshCwIcon size={32} className="mx-auto mb-3 animate-spin opacity-50" />
                Loading jobs...
              </div>
            ) : sortedJobs.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <SearchIcon size={40} className="mx-auto mb-3 opacity-30" />
                <p className="mb-1">No jobs in database yet.</p>
                <p className="text-xs text-slate-600 mb-4 max-w-md mx-auto">
                  Set up Profile (top right) → upload resume → click Scan Now → wait 60–90s → refresh.
                </p>
                <button onClick={triggerScan} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Run First Scan
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {sortedJobs.filter(j => !j.is_govt).map(job => (
                  <JobCard key={job.id} job={job} onApply={handleApply} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Govt Schemes Tab */}
        {tab === "govt" && (
          <div>
            <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-4 mb-5 flex items-start gap-3">
              <ShieldCheckIcon size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-400">100% Verified Government Listings</p>
                <p className="text-xs text-slate-400 mt-0.5">All listings from NCS Portal, AICTE, DRDO, and IITs are pre-verified. Fake risk is always 0.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {jobs.filter(j => j.is_govt).map(job => (
                <JobCard key={job.id} job={job} onApply={handleApply} />
              ))}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {tab === "applied" && <ApplicationsTab />}

        {/* Resume Tab */}
        {tab === "resume" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-100 mb-2">📄 Upload Resume</h3>
              <p className="text-sm text-slate-400 mb-4">Upload your resume (.txt format) to auto-extract skills and improve job matching accuracy.</p>
              <div className="flex gap-3">
                <input
                  type="file"
                  accept=".txt,.pdf"
                  onChange={e => setResumeFile(e.target.files[0])}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-300 file:mr-3 file:bg-violet-600 file:text-white file:border-0 file:px-3 file:py-1 file:rounded-lg file:text-xs cursor-pointer"
                />
                <button
                  onClick={uploadResume}
                  disabled={!resumeFile}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>

            {profile?.skills?.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-100 mb-3">🎯 Extracted Skills ({profile.skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span key={skill} className="text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-100 mb-3">⚙️ Scraper Status</h3>
              <div className="space-y-2 text-sm">
                {["Internshala", "NCS Portal (Govt)", "Unstop", "AICTE Internships", "DRDO"].map(source => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-slate-400">{source}</span>
                    <span className="text-emerald-400 text-xs font-medium">✅ Active</span>
                  </div>
                ))}
                <div className="border-t border-slate-700 pt-2 mt-2 text-slate-500 text-xs">
                  Scrapes every 30 minutes automatically
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
