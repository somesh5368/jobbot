import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { 
  FileUp, Upload, CheckCircle2, ChevronRight, 
  Sparkles, Download, Tags, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResumeATS() {
  const [profile, setProfile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  const loadResumeData = async () => {
    try {
      const prof = await api.getProfile();
      setProfile(prof);
      
      const vers = await api.getResumeVersions();
      setVersions(vers.versions || []);
      
      const savedJobs = await api.getJobs({ status: 'saved' });
      setJobs(savedJobs.jobs || []);
    } catch (err) {
      console.error("Failed loading resume analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumeData();
  }, []);

  const handleUploadMaster = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const uploadToast = toast.loading("Uploading and parsing master resume using Claude AI...");
    try {
      await api.uploadResume(file);
      toast.success("Master resume parsed and profile updated successfully!", {
        id: uploadToast,
        duration: 4000
      });
      loadResumeData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed uploading master resume", { id: uploadToast });
    } finally {
      setUploading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim() || !profile) return;
    
    const updatedSkills = [...(profile.skills || []), newSkill.trim()];
    try {
      await api.updateProfile({ skills: updatedSkills });
      setProfile({ ...profile, skills: updatedSkills });
      setNewSkill('');
      toast.success("Skill tag added");
    } catch (err) {
      toast.error("Failed to add skill");
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    if (!profile) return;
    const updatedSkills = profile.skills.filter(s => s !== skillToRemove);
    try {
      await api.updateProfile({ skills: updatedSkills });
      setProfile({ ...profile, skills: updatedSkills });
      toast.success("Skill tag removed");
    } catch (err) {
      toast.error("Failed to remove skill");
    }
  };

  const handleOptimizeForJob = async () => {
    if (!selectedJobId) {
      toast.error("Please select a target job card");
      return;
    }
    setOptimizing(true);
    const optToast = toast.loading("Aligning keywords and generating ATS resume PDF...");
    try {
      await api.generateATSResume(selectedJobId);
      toast.success("ATS Resume PDF generated successfully! Added to versions history.", {
        id: optToast,
        duration: 4000
      });
      setSelectedJobId('');
      loadResumeData();
    } catch (err) {
      toast.error("Failed compiling optimized resume", { id: optToast });
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Resume & ATS Tailoring</h2>
          <p className="text-xs text-slate-400">Optimize resumes, extract technical skills, and manage tailored resume copies.</p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Compiling resume vault...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* LEFT COLUMN: Master resume & Skills */}
            <div className="space-y-6">
              
              {/* Document Uploader */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <FileUp className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Master Resume</h3>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-6 bg-slate-950/20 hover:border-slate-700 transition-colors">
                  <Upload className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-300 font-semibold mb-1">Upload Master CV File</p>
                  <p className="text-[10px] text-slate-500 mb-4">PDF, DOCX, or TXT formats (up to 10MB)</p>
                  
                  <label className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs cursor-pointer disabled:opacity-50">
                    {uploading ? 'Processing...' : 'Choose File'}
                    <input 
                      type="file" 
                      onChange={handleUploadMaster}
                      disabled={uploading}
                      className="hidden" 
                      accept=".pdf,.docx,.txt"
                    />
                  </label>
                </div>

                {profile?.resume_url && (
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Master resume uploaded</span>
                    {/* Placeholder click to download master */}
                  </div>
                )}
              </div>

              {/* Skills Tags Manager */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <Tags className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Extracted Skills</h3>
                </div>

                {/* Tags lists */}
                <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto pr-1">
                  {profile?.skills?.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded bg-slate-950 px-2.5 py-1 text-xs text-slate-350 border border-slate-850">
                      {skill}
                      <button 
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-slate-300 ml-1 text-[10px]"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {(!profile?.skills || profile.skills.length === 0) && (
                    <p className="text-xs text-slate-650 italic py-2">No skills registered. Upload your resume to auto-extract.</p>
                  )}
                </div>

                {/* Add new skill form */}
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add manual skill (e.g. Docker)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <button 
                    type="submit"
                    className="rounded-lg bg-slate-800 border border-slate-750 px-4 py-2 text-xs text-slate-300 font-semibold hover:bg-slate-700"
                  >
                    Add
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: Resume versions & Manual Optimization */}
            <div className="space-y-6">
              
              {/* Manual Optimization */}
              {jobs.length > 0 && (
                <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">ATS Tailoring Sandbox</h3>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Select a bookmarked target job listing to automatically rephrase descriptions and frontload matching skills.
                  </p>

                  <div className="flex gap-2.5">
                    <select 
                      value={selectedJobId} 
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-250 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Choose a bookmarked job...</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.company} &bull; {job.title}</option>
                      ))}
                    </select>
                    
                    <button 
                      onClick={handleOptimizeForJob}
                      disabled={optimizing || !selectedJobId}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs disabled:opacity-50 shrink-0"
                    >
                      {optimizing ? 'Tailoring...' : 'Optimize'}
                    </button>
                  </div>
                </div>
              )}

              {/* Resume versions list */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">ATS Tailored Copies</h3>
                </div>

                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {versions.map((ver) => (
                    <div key={ver.id} className="rounded-lg bg-slate-950/40 p-4 border border-slate-900 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-200">{ver.version_label}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Created: {new Date(ver.generated_at).toLocaleDateString()}</p>
                        </div>
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          🎯 {ver.ats_score_after}% Score
                        </span>
                      </div>

                      {/* Bullet edits logs */}
                      {ver.changes_made && ver.changes_made.length > 0 && (
                        <div className="mt-3 text-[11px] text-slate-400">
                          <p className="font-semibold text-slate-400 mb-1">Tailored Bullet Edits:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {ver.changes_made.slice(0, 3).map((change, idx) => (
                              <li key={idx} className="truncate" title={change}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Download */}
                      <div className="mt-4 border-t border-slate-900 pt-3 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Predicted Increase: +{ver.ats_score_after - ver.ats_score_before} points</span>
                        {ver.download_url && (
                          <a 
                            href={ver.download_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Download PDF <Download className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {versions.length === 0 && (
                    <p className="text-xs text-slate-650 italic text-center py-8">No resume tailors compiled yet.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
