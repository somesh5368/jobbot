import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { 
  UserRound, Sliders, GraduationCap, 
  Briefcase, Plus, Trash2, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const [profile, setProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile forms
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [expectedCtc, setExpectedCtc] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [expLevel, setExpLevel] = useState('fresher');
  const [prefRoles, setPrefRoles] = useState('');
  const [prefLocs, setPrefLocs] = useState('');
  
  // Automation settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(60);
  const [autoApply, setAutoApply] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(85);

  // Sub-items creation
  const [showEduForm, setShowEduForm] = useState(false);
  const [eduDegree, setEduDegree] = useState('');
  const [eduInst, setEduInst] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduCGPA, setEduCGPA] = useState('');
  
  const [showExpForm, setShowExpForm] = useState(false);
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expDesc, setExpDesc] = useState('');

  const loadProfileSettings = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      
      // Populate fields
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setCity(data.city || '');
      setState(data.state || '');
      setLinkedin(data.linkedin_url || '');
      setGithub(data.github_url || '');
      setPortfolio(data.portfolio_url || '');
      setExpectedCtc(data.expected_ctc || '');
      setNoticePeriod(data.notice_period || '');
      setExpLevel(data.experience_level || 'fresher');
      setPrefRoles(data.preferred_roles?.join(', ') || '');
      setPrefLocs(data.preferred_locations?.join(', ') || '');
      
      setEmailAlerts(data.email_alerts_enabled);
      setAlertThreshold(data.alert_threshold || 60);
      setAutoApply(data.auto_apply_enabled);
      setAutoApplyThreshold(data.auto_apply_threshold || 85);
      
      setEducation(data.education || []);
      setExperience(data.experience || []);
    } catch (err) {
      console.error("Failed loading profile panels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileSettings();
  }, []);

  const handleUpdatePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    const photoToast = toast.loading("Uploading profile image to vault storage...");
    try {
      await api.uploadPhoto(file);
      toast.success("Profile photo updated!", { id: photoToast });
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed uploading photo", { id: photoToast });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        full_name: fullName,
        email: email,
        phone: phone,
        city: city,
        state: state,
        linkedin_url: linkedin,
        github_url: github,
        portfolio_url: portfolio,
        expected_ctc: expectedCtc,
        notice_period: noticePeriod,
        experience_level: expLevel,
        preferred_roles: prefRoles.split(',').map(r => r.trim()).filter(Boolean),
        preferred_locations: prefLocs.split(',').map(l => l.trim()).filter(Boolean),
        email_alerts_enabled: emailAlerts,
        alert_threshold: alertThreshold,
        auto_apply_enabled: autoApply,
        auto_apply_threshold: autoApplyThreshold
      };
      await api.updateProfile(payload);
      toast.success("Profile details updated successfully");
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed saving profile changes");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddEdu = async (e) => {
    e.preventDefault();
    if (!eduDegree.trim() || !eduInst.trim()) return;

    try {
      await api.addEducation({
        degree: eduDegree.trim(),
        institution: eduInst.trim(),
        field_of_study: eduField.trim(),
        cgpa_or_percentage: eduCGPA.trim()
      });
      toast.success("Education record inserted");
      setEduDegree('');
      setEduInst('');
      setEduField('');
      setEduCGPA('');
      setShowEduForm(false);
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed to add education");
    }
  };

  const handleAddExp = async (e) => {
    e.preventDefault();
    if (!expCompany.trim() || !expRole.trim()) return;

    try {
      await api.addExperience({
        company: expCompany.trim(),
        role: expRole.trim(),
        employment_type: 'internship',
        start_date: new Date().toISOString().slice(0,10),
        description: expDesc.trim()
      });
      toast.success("Work history entry registered");
      setExpCompany('');
      setExpRole('');
      setExpDesc('');
      setShowExpForm(false);
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed to add experience");
    }
  };

  const handleDeleteEdu = async (id) => {
    try {
      await api.deleteEducation(id);
      toast.success("Education record removed");
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  const handleDeleteExp = async (id) => {
    try {
      await api.deleteExperience(id);
      toast.success("Experience record removed");
      loadProfileSettings();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Profile Settings</h2>
          <p className="text-xs text-slate-400">Configure your professional preferences, automation limits, and experience history.</p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Reading profile properties...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* LEFT / CENTER: Settings Form (Span 2) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Form profile */}
              <form onSubmit={handleSaveProfile} className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-6 text-xs text-slate-300">
                
                {/* Photo uploader */}
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    {profile?.photo_url ? (
                      <img 
                        src={profile.photo_url} 
                        alt="Profile Picture" 
                        className="h-16 w-16 rounded-full object-cover border border-slate-800"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-850 border border-slate-800 font-extrabold text-lg text-slate-400">
                        {fullName.charAt(0)}
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-slate-950/65 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-4 w-4 text-white" />
                      <input 
                        type="file" 
                        onChange={handleUpdatePhoto}
                        disabled={uploadingPhoto}
                        className="hidden" 
                        accept="image/*"
                      />
                    </label>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">Profile Portrait</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Click photo to update portrait assets.</p>
                  </div>
                </div>

                {/* 1. Personal Specifications */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-indigo-400 border-b border-slate-900 pb-2">
                    <UserRound className="h-4 w-4" /> Personal Specifications
                  </h3>
                  
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Email Alerts Destination</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Phone</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">City</label>
                      <input 
                        type="text" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">State</label>
                      <input 
                        type="text" 
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Preferences */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-indigo-400 border-b border-slate-900 pb-2">
                    <Sliders className="h-4 w-4" /> Professional Preferences
                  </h3>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Experience Level</label>
                      <select 
                        value={expLevel}
                        onChange={(e) => setExpLevel(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="fresher">Fresher</option>
                        <option value="intern">Intern</option>
                        <option value="1-3yr">1-3 Years</option>
                        <option value="3-5yr">3-5 Years</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Expected CTC / Salary</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 8-12 LPA"
                        value={expectedCtc}
                        onChange={(e) => setExpectedCtc(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Notice Period</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Immediate"
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-500 font-semibold">Preferred Roles (Comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ML Engineer, AI Developer, Python Backend"
                      value={prefRoles}
                      onChange={(e) => setPrefRoles(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-slate-500 font-semibold">Preferred Locations (Comma-separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Remote, Bangalore, Hyderabad"
                      value={prefLocs}
                      onChange={(e) => setPrefLocs(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Update Submit */}
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-indigo-600/20"
                  >
                    {savingSettings ? 'Saving...' : 'Save Profile Settings'}
                  </button>
                </div>

              </form>

            </div>

            {/* RIGHT COLUMN: Automation slider configuration & Academic details */}
            <div className="space-y-6">
              
              {/* Automation thresholds */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-5 text-xs text-slate-300">
                <h3 className="font-bold uppercase tracking-wider text-[10px] text-indigo-400 border-b border-slate-900 pb-2 flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> Agent Automation
                </h3>

                {/* Email alerts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Email Alerts</span>
                    <input 
                      type="checkbox" 
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  {emailAlerts && (
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-950/40">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                        <span>Alert Threshold</span>
                        <span className="text-indigo-400 font-bold">{alertThreshold}% match</span>
                      </div>
                      <input 
                        type="range" 
                        min="60" 
                        max="100" 
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Auto apply */}
                <div className="space-y-2 pt-3 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Auto-Apply</span>
                    <input 
                      type="checkbox" 
                      checked={autoApply}
                      onChange={(e) => setAutoApply(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  {autoApply && (
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-950/40">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                        <span>Auto-Apply Threshold</span>
                        <span className="text-indigo-400 font-bold">{autoApplyThreshold}% match</span>
                      </div>
                      <input 
                        type="range" 
                        min="75" 
                        max="100" 
                        value={autoApplyThreshold}
                        onChange={(e) => setAutoApplyThreshold(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Education lists */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="font-bold uppercase tracking-wider text-[10px] text-indigo-400 flex items-center gap-1.5">
                    <GraduationCap className="h-4.5 w-4.5" /> Education History
                  </h3>
                  <button 
                    onClick={() => setShowEduForm(!showEduForm)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                {/* Form to insert degree */}
                {showEduForm && (
                  <form onSubmit={handleAddEdu} className="space-y-3 bg-slate-950/30 p-3 rounded-lg border border-slate-850">
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        placeholder="Degree (e.g. B.Tech)" 
                        value={eduDegree}
                        onChange={(e) => setEduDegree(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        placeholder="Institution name..." 
                        value={eduInst}
                        onChange={(e) => setEduInst(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      <input 
                        type="text" 
                        placeholder="Field of study..." 
                        value={eduField}
                        onChange={(e) => setEduField(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="CGPA / Grade" 
                        value={eduCGPA}
                        onChange={(e) => setEduCGPA(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full rounded bg-indigo-600 py-1.5 text-white font-bold hover:bg-indigo-500"
                    >
                      Save Degree
                    </button>
                  </form>
                )}

                {/* List */}
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {education.map(edu => (
                    <div key={edu.id} className="flex justify-between items-start bg-slate-950/40 p-2.5 rounded border border-slate-900">
                      <div>
                        <h4 className="font-bold text-slate-200">{edu.degree} &bull; {edu.field_of_study}</h4>
                        <p className="text-[10px] text-slate-550 truncate w-36" title={edu.institution}>{edu.institution}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteEdu(edu.id)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience lists */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h3 className="font-bold uppercase tracking-wider text-[10px] text-indigo-400 flex items-center gap-1.5">
                    <Briefcase className="h-4.5 w-4.5" /> Experience history
                  </h3>
                  <button 
                    onClick={() => setShowExpForm(!showExpForm)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                {/* Form to insert work */}
                {showExpForm && (
                  <form onSubmit={handleAddExp} className="space-y-3 bg-slate-950/30 p-3 rounded-lg border border-slate-850">
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        placeholder="Company name..." 
                        value={expCompany}
                        onChange={(e) => setExpCompany(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text" 
                        placeholder="Role / Title..." 
                        value={expRole}
                        onChange={(e) => setExpRole(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <textarea 
                        placeholder="Describe key responsibilities..." 
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        className="rounded border border-slate-800 bg-slate-950 p-2 focus:border-indigo-500 focus:outline-none"
                        rows={2}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full rounded bg-indigo-600 py-1.5 text-white font-bold hover:bg-indigo-500"
                    >
                      Save Work Experience
                    </button>
                  </form>
                )}

                {/* List */}
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                  {experience.map(exp => (
                    <div key={exp.id} className="flex justify-between items-start bg-slate-950/40 p-2.5 rounded border border-slate-900">
                      <div>
                        <h4 className="font-bold text-slate-200">{exp.role}</h4>
                        <p className="text-[10px] text-slate-550 truncate w-36" title={exp.company}>{exp.company}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteExp(exp.id)}
                        className="text-slate-600 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
