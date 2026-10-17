import React from 'react';
import { formatFileSize, getDirectUrl } from '../services/proxyService';

interface GenericFileViewerProps {
  url: string;
  filename: string;
  fileType?: string;
  size?: number;
  onDownload: () => void;
  isDownloading?: boolean;
}

export const GenericFileViewer: React.FC<GenericFileViewerProps> = ({
  url,
  filename,
  fileType,
  size,
  onDownload,
  isDownloading
}) => {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  const getFileBadgeAndIcon = () => {
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return {
        icon: '📊',
        title: 'Lembar Sebar (Spreadsheet)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
        badge: 'EXCEL / SPREADSHEET'
      };
    }
    if (['pptx', 'ppt'].includes(ext)) {
      return {
        icon: '📑',
        title: 'Presentasi Slide',
        bg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
        badge: 'POWERPOINT'
      };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return {
        icon: '📦',
        title: 'Arsip Berkas',
        bg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
        badge: 'COMPRESSED ARCHIVE'
      };
    }
    return {
      icon: '📄',
      title: 'Berkas Dokumen',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
      badge: (ext || fileType || 'FILE').toUpperCase()
    };
  };

  const info = getFileBadgeAndIcon();

  return (
    <div className="w-full flex-1 min-h-[300px] flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner border ${info.bg}`}>
        {info.icon}
      </div>

      <div className="space-y-1.5">
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
          {info.badge}
        </span>
        <h5 className="font-black text-slate-800 dark:text-white text-base truncate max-w-md pt-1">
          {filename}
        </h5>
        {size && size > 0 && (
          <p className="text-xs font-semibold text-slate-400">
            Ukuran: {formatFileSize(size)}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Berkas {info.title.toLowerCase()} siap diunduh ke perangkat Anda untuk dibuka dengan aplikasi terkait.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Mengunduh Berkas...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Unduh Berkas</span>
            </>
          )}
        </button>

        <a
          href={getDirectUrl(url) || url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
        >
          Buka Tautan Langsung
        </a>
      </div>
    </div>
  );
};
