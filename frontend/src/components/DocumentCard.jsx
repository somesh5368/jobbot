import React, { useState } from 'react';
import { 
  File, FileSpreadsheet, Shield, GraduationCap, 
  Award, Briefcase, Download, Trash2, Calendar, Clipboard
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function DocumentCard({ doc, onRefresh }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Format file size in readable units
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get icon representing document category
  const getDocIcon = (type) => {
    const t = type.toLowerCase();
    if (["aadhar", "pan", "passport", "voter_id"].includes(t)) {
      return Shield;
    }
    if (["marksheet_10", "marksheet_12", "degree", "marksheet_sem"].includes(t)) {
      return GraduationCap;
    }
    if (["certificate"].includes(t)) {
      return Award;
    }
    if (["offer_letter", "experience_letter", "experience"].includes(t)) {
      return Briefcase;
    }
    return File;
  };

  const Icon = getDocIcon(doc.document_type);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.getDocumentDownload(doc.id);
      if (res.download_url) {
        window.open(res.download_url, '_blank');
      } else {
        toast.error("Download link expired or unavailable.");
      }
    } catch (err) {
      toast.error("Failed fetching download credentials");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this document from the vault?")) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteDocument(doc.id);
      toast.success("Document removed successfully");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed removing file from database");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between h-44">
      
      {/* 1. Category and Metadata Info */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-750 text-indigo-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 truncate w-36" title={doc.document_name}>
                {doc.document_name}
              </h4>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {doc.document_type.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Muted file stats */}
        <div className="mt-3.5 space-y-1 text-[11px] text-slate-500">
          <p className="truncate" title={doc.file_name}>📄 {doc.file_name}</p>
          <p>💾 {formatBytes(doc.file_size_bytes)} &bull; {doc.mime_type.split('/')[1]?.toUpperCase() || 'PDF'}</p>
          {doc.notes && <p className="truncate italic text-slate-450 mt-1" title={doc.notes}>📝 {doc.notes}</p>}
        </div>
      </div>

      {/* 2. Actions Row */}
      <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <Calendar className="h-3 w-3" /> {new Date(doc.uploaded_at).toLocaleDateString([], {day:'2-digit', month:'short'})}
        </span>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded bg-slate-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-slate-900 transition-colors"
            title="Delete Document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 text-xs disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Loading...' : 'Download'}
          </button>
        </div>
      </div>

    </div>
  );
}
