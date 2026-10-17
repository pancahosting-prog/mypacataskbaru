import React, { useEffect, useRef, useState } from 'react';
import { getProxiedUrl, getDirectUrl, formatFileSize } from '../services/proxyService';

interface DocxViewerProps {
  url: string;
  filename: string;
  size?: number;
  onDownload: () => void;
  isDownloading?: boolean;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({
  url,
  filename,
  size,
  onDownload,
  isDownloading
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageScale, setPageScale] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setPageCount(null);

    const loadAndRenderDocx = async () => {
      try {
        let buffer: ArrayBuffer | null = null;

        // 1. If base64 data URL, parse directly in-memory without network request
        if (url.startsWith('data:')) {
          const marker = ';base64,';
          const idx = url.indexOf(marker);
          if (idx !== -1) {
            const b64 = url.substring(idx + marker.length);
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            buffer = bytes.buffer;
          }
        }

        // 2. If blob URL, fetch directly
        if (!buffer && url.startsWith('blob:')) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              buffer = await res.arrayBuffer();
            }
          } catch (blobErr) {
            console.warn('Blob fetch error:', blobErr);
          }
        }

        // 3. If HTTP/HTTPS URL, try direct fetch first or proxy with HTML detection
        if (!buffer && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
          let res: Response | null = null;
          const direct = getDirectUrl(url);

          // Try direct URL first if available (especially robust on static hosts like Netlify)
          if (direct && direct !== url && !direct.includes('/api/proxy-file')) {
            try {
              res = await fetch(direct);
            } catch (dirErr) {
              console.warn('Direct URL fetch failed:', dirErr);
            }
          }

          // If direct fetch didn't succeed, try proxy
          if (!res || !res.ok) {
            try {
              const proxied = getProxiedUrl(url);
              const proxyRes = await fetch(proxied);
              if (proxyRes.ok) {
                const ct = proxyRes.headers.get('content-type') || '';
                if (!ct.includes('text/html')) {
                  res = proxyRes;
                } else {
                  console.warn('Proxy returned HTML (static hosting fallback), trying original URL...');
                }
              }
            } catch (e) {
              console.warn('Proxy fetch failed:', e);
            }
          }

          // Try original URL fetch if still not loaded
          if ((!res || !res.ok) && url !== direct && !url.includes('/api/proxy-file')) {
            try {
              res = await fetch(url);
            } catch (uErr) {
              console.warn('Original URL fetch failed:', uErr);
            }
          }

          if (res && res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
              throw new Error('Pratinjau visual langsung tidak tersedia di hosting statis tanpa backend proxy. Silakan klik tombol "Unduh Berkas" di atas untuk membuka dokumen secara utuh di Microsoft Word.');
            }
            buffer = await res.arrayBuffer();
          }
        }

        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Tidak dapat mengunduh atau membaca data dokumen Word (Ukuran berkas 0 byte).');
        }

        // Validate ZIP / DOCX signature (PK\x03\x04)
        const uint8 = new Uint8Array(buffer);
        const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B;
        if (!isZip) {
          // Check for legacy binary .doc format (D0 CF 11 E0)
          if (uint8.length >= 4 && uint8[0] === 0xD0 && uint8[1] === 0xCF) {
            throw new Error('Dokumen ini berformat Word biner lawas (.doc). Pratinjau langsung di browser memerlukan format modern (.docx). Silakan gunakan tombol unduh di atas untuk membukanya di Microsoft Word.');
          }
          throw new Error('Format berkas tidak valid atau rusak untuk dokumen Microsoft Word (.docx).');
        }

        if (!isMounted) return;

        // Ensure container element is attached
        if (!containerRef.current) {
          await new Promise(r => setTimeout(r, 50));
        }

        if (!containerRef.current) {
          throw new Error('Elemen penampil dokumen tidak tersedia di layar.');
        }

        containerRef.current.innerHTML = '';

        // Import and render using docx-preview
        const { renderAsync } = await import('docx-preview');
        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
        });

        // Count rendered pages
        const pages = containerRef.current.querySelectorAll('section.docx');
        if (pages && pages.length > 0) {
          setPageCount(pages.length);
        }

        if (isMounted) {
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        console.warn('Docx rendering error:', err);
        if (isMounted) {
          setError(err.message || 'Gagal memproses pratinjau visual dokumen Word.');
          setIsLoading(false);
        }
      }
    };

    loadAndRenderDocx();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <div className="w-full flex flex-col items-center justify-start h-full">
      {/* Top Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800/90 rounded-2xl mb-3 border border-slate-200/90 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zm-3 9.5a1.5 1.5 0 0 1-1.5-1.5V11a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1-1.5 1.5zm-2.5 3.5h5v1.5h-5V17z"/>
            </svg>
            <span>Word DOCX</span>
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[220px] sm:max-w-md" title={filename}>
            {filename}
          </span>
          {size && size > 0 && (
            <span className="text-[11px] font-semibold text-slate-400">
              ({formatFileSize(size)})
            </span>
          )}
          {pageCount && (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
              {pageCount} Halaman
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!error && !isLoading && (
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => setPageScale(prev => Math.max(0.6, Number((prev - 0.1).toFixed(1))))}
                className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-all active:scale-90"
                title="Perkecil Ukuran Tampilan (Zoom Out)"
              >
                −
              </button>
              <span className="text-[10px] font-black px-1.5 text-slate-600 dark:text-slate-300 min-w-[42px] text-center select-none">
                {Math.round(pageScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setPageScale(prev => Math.min(1.6, Number((prev + 0.1).toFixed(1))))}
                className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-all active:scale-90"
                title="Perbesar Ukuran Tampilan (Zoom In)"
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
            title="Unduh dokumen .docx ke komputer/ponsel"
          >
            {isDownloading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Mengunduh...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Unduh Berkas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className="w-full flex-1 min-h-[420px] max-h-[75vh] overflow-y-auto relative bg-slate-200/80 dark:bg-slate-950 p-3 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center custom-scrollbar">
        {/* Loading Spinner State */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xs rounded-2xl text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-blue-600 text-xs">W</div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                Menyiapkan Pratinjau Dokumen Microsoft Word...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Membaca dan memformat tata letak halaman ({filename})
              </p>
            </div>
          </div>
        )}

        {/* Error Fallback Card */}
        {error ? (
          <div className="w-full flex-1 min-h-[380px] flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto my-auto shadow-sm">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center text-3xl font-black shadow-inner border border-blue-200 dark:border-blue-900">
              W
            </div>
            <div>
              <h5 className="font-black text-slate-800 dark:text-white text-base truncate max-w-md mx-auto" title={filename}>
                {filename}
              </h5>
              {size && size > 0 && (
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Ukuran berkas: {formatFileSize(size)}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
                {error}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{isDownloading ? 'Mengunduh...' : 'Unduh Berkas (.docx)'}</span>
              </button>

              <a
                href={getDirectUrl(url) || url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                Buka Tautan Sumber
              </a>
            </div>
          </div>
        ) : (
          /* Container is ALWAYS mounted in DOM so renderAsync never encounters null */
          <div
            className="w-full flex justify-center py-2"
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.25s ease'
            }}
          >
            <div
              ref={containerRef}
              style={{
                transform: `scale(${pageScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease'
              }}
              className="mypanca-docx-preview-root w-full max-w-4xl"
            />
          </div>
        )}
      </div>

      {/* Embedded CSS for authentic Microsoft Word paper layout */}
      <style>{`
        .mypanca-docx-preview-root .docx-wrapper {
          background: transparent !important;
          padding: 12px 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
        }
        .mypanca-docx-preview-root section.docx {
          background: #ffffff !important;
          color: #1e293b !important;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15), 0 2px 6px -1px rgba(0, 0, 0, 0.08) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          margin-bottom: 24px !important;
          border-radius: 4px !important;
          overflow: hidden !important;
          max-width: 100% !important;
        }
        .mypanca-docx-preview-root section.docx p {
          margin-bottom: 0.5em !important;
          line-height: 1.5 !important;
        }
        .mypanca-docx-preview-root section.docx table {
          border-collapse: collapse !important;
          margin: 0.75em 0 !important;
        }
      `}</style>
    </div>
  );
};
