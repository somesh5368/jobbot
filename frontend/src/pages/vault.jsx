import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import DocumentCard from '../components/DocumentCard';
import { api } from '../lib/api';
import { FolderLock, Plus, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentVault() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Upload Form State
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('aadhar');
  const [docName, setDocName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      setDocs(res || []);
    } catch (err) {
      console.error("Failed loading vault directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !docName.trim()) {
      toast.error("Please select a file and enter a descriptive name");
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading("Encrypting and uploading file to private vault storage...");
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('document_name', docName.trim());
      if (issuer) formData.append('issued_by', issuer);
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (notes) formData.append('notes', notes);
      
      await api.uploadDocument(formData);
      
      toast.success("Document uploaded securely!", { id: uploadToast });
      setShowUploadModal(false);
      
      // Reset Form
      setFile(null);
      setDocName('');
      setIssuer('');
      setIssueDate('');
      setExpiryDate('');
      setNotes('');
      
      loadDocuments();
    } catch (err) {
      toast.error("Failed uploading document", { id: uploadToast });
    } finally {
      setUploading(false);
    }
  };

  const getDocTypeCategory = (type) => {
    const t = type.toLowerCase();
    if (["aadhar", "pan", "passport", "voter_id"].includes(t)) return 'identity';
    if (["marksheet_10", "marksheet_12", "degree", "marksheet_sem"].includes(t)) return 'academic';
    if (["certificate"].includes(t)) return 'certificates';
    if (["offer_letter", "experience_letter", "experience"].includes(t)) return 'experience';
    return 'other';
  };

  const filteredDocs = docs.filter(doc => {
    if (filter === 'all') return true;
    return getDocTypeCategory(doc.document_type) === filter;
  });

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header Details */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100">Document Vault</h2>
            <p className="text-xs text-slate-400">Secure storage for academic and identity files, accessed via timed links.</p>
          </div>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-lg shadow-indigo-600/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-thin border-b border-slate-900">
          {[
            { key: 'all', label: 'All Vault' },
            { key: 'identity', label: 'Identity' },
            { key: 'academic', label: 'Academics' },
            { key: 'certificates', label: 'Certificates' },
            { key: 'experience', label: 'Professional' },
            { key: 'other', label: 'Other Docs' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-t-lg px-4 py-2.5 border-b-2 transition-all shrink-0 ${
                filter === tab.key 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid Lists */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">
            Scanning secure lockers...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onRefresh={loadDocuments} />
            ))}
            
            {filteredDocs.length === 0 && (
              <div className="col-span-full rounded-xl border border-slate-900 bg-slate-900/10 p-12 text-center text-slate-500">
                <FolderLock className="mx-auto h-8 w-8 text-slate-700 mb-3" />
                No documents found matching category. Upload identity/academic papers to register them.
              </div>
            )}
          </div>
        )}

        {/* Upload Modal Overlay */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              
              {/* Close */}
              <button 
                onClick={() => setShowUploadModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-slate-100">
                <FolderLock className="h-5 w-5 text-indigo-400" />
                <h3 className="text-md font-bold tracking-tight">Upload Private Document</h3>
              </div>

              {/* Form */}
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                
                {/* File picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Select File</label>
                  <input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-350 focus:border-indigo-500 focus:outline-none"
                    required 
                  />
                </div>

                {/* Grid Type & Name */}
                <div className="grid gap-4 grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Document Category</label>
                    <select 
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="aadhar">Aadhar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="marksheet_10">10th Marksheet</option>
                      <option value="marksheet_12">12th Marksheet</option>
                      <option value="degree">Degree Certificate</option>
                      <option value="offer_letter">Offer Letter</option>
                      <option value="certificate">Achievement Certificate</option>
                      <option value="other">Other Document</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Document Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CBSE 10th Marksheet"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Grid Issuer & Dates */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Issued By</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CBSE, College"
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Issue Date</label>
                    <input 
                      type="date" 
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Expiry (Optional)</label>
                    <input 
                      type="date" 
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-slate-450 uppercase tracking-wider text-[10px]">Additional Notes</label>
                  <textarea 
                    placeholder="Reference numbers or comments..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    rows={2}
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-3">
                  <button 
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="rounded-lg border border-slate-805 hover:bg-slate-850 px-5 py-2 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 shadow-lg shadow-indigo-600/20"
                  >
                    {uploading ? 'Uploading...' : 'Save securely'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
