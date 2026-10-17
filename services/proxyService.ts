export const getProxiedUrl = (
  originalUrl?: string,
  forceAbsolute = false,
  downloadFilename?: string
): string => {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('#') || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }

  let proxied = '';

  // If already proxied
  if (originalUrl.includes('/api/proxy-file')) {
    proxied = originalUrl;
  } else if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
    proxied = `/api/proxy-file?url=${encodeURIComponent(originalUrl)}`;
  } else {
    return originalUrl;
  }

  if (downloadFilename) {
    const separator = proxied.includes('?') ? '&' : '?';
    proxied += `${separator}download=true&filename=${encodeURIComponent(downloadFilename)}`;
  }

  if (forceAbsolute && typeof window !== 'undefined') {
    if (!proxied.startsWith('http://') && !proxied.startsWith('https://')) {
      proxied = `${window.location.origin}${proxied}`;
    }
  }

  return proxied;
};

export const getDirectUrl = (url?: string): string => {
  if (!url) return '';
  if (url.includes('/api/proxy-file')) {
    try {
      const match = url.match(/[?&]url=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      // ignore
    }
  }
  return url;
};

export const isImageFile = (fileType?: string, fileNameOrUrl?: string): boolean => {
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (ft.includes('image') || ft === 'img' || ft === 'photo' || ft === 'picture') return true;
  }
  if (fileNameOrUrl) {
    const clean = fileNameOrUrl.split('?')[0].toLowerCase();
    if (/\.(jpeg|jpg|gif|png|webp|svg|bmp|ico|heic|tiff)$/i.test(clean)) return true;
  }
  return false;
};

export const isPdfFile = (fileType?: string, fileNameOrUrl?: string): boolean => {
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (ft.includes('pdf')) return true;
  }
  if (fileNameOrUrl) {
    const clean = fileNameOrUrl.split('?')[0].toLowerCase();
    if (/\.pdf$/i.test(clean)) return true;
  }
  return false;
};

export const isDocxFile = (fileType?: string, fileNameOrUrl?: string): boolean => {
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (
      ft.includes('word') ||
      ft.includes('docx') ||
      ft.includes('document') ||
      ft.includes('officedocument') ||
      ft.includes('msword')
    ) {
      return true;
    }
  }
  if (fileNameOrUrl) {
    const lower = fileNameOrUrl.toLowerCase();
    if (lower.startsWith('data:') && lower.includes('wordprocessingml')) return true;
    try {
      const decoded = decodeURIComponent(fileNameOrUrl);
      const clean = decoded.split('?')[0].split('#')[0].toLowerCase();
      if (/\.(docx|doc)$/i.test(clean)) return true;
    } catch {
      const clean = fileNameOrUrl.split('?')[0].split('#')[0].toLowerCase();
      if (/\.(docx|doc)$/i.test(clean)) return true;
    }
  }
  return false;
};

export const isTextFile = (fileType?: string, fileNameOrUrl?: string): boolean => {
  if (fileType) {
    const ft = fileType.toLowerCase();
    if (ft.includes('text') || ft === 'txt' || ft === 'csv' || ft === 'json' || ft === 'markdown') return true;
  }
  if (fileNameOrUrl) {
    const clean = fileNameOrUrl.split('?')[0].toLowerCase();
    if (/\.(txt|csv|log|json|md|xml|yaml|yml)$/i.test(clean)) return true;
  }
  return false;
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const triggerBlobDownload = (blob: Blob, filename: string): boolean => {
  try {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename || 'berkas';
    a.setAttribute('download', filename || 'berkas');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 15000);
    return true;
  } catch (err) {
    console.warn('triggerBlobDownload error:', err);
    return false;
  }
};

export const downloadFile = async (url: string, filename: string): Promise<boolean> => {
  if (!url) return false;
  const safeFilename = filename || 'berkas';

  // 1. Direct Base64 Data URL decoding
  if (url.startsWith('data:')) {
    try {
      const marker = ';base64,';
      const markerIdx = url.indexOf(marker);
      if (markerIdx !== -1) {
        const mime = url.substring(5, markerIdx);
        const b64Data = url.substring(markerIdx + marker.length);
        const raw = atob(b64Data);
        const u8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          u8[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([u8], { type: mime || 'application/octet-stream' });
        return triggerBlobDownload(blob, safeFilename);
      }
    } catch (dataErr) {
      console.warn('Data URL download error:', dataErr);
    }
  }

  // 2. Direct Blob URL
  if (url.startsWith('blob:')) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return triggerBlobDownload(blob, safeFilename);
      }
    } catch (blobErr) {
      console.warn('Blob URL fetch error:', blobErr);
    }
  }

  // 3. Remote URL via proxy endpoint with Blob download
  const proxied = getProxiedUrl(url, true, safeFilename);
  try {
    const res = await fetch(proxied);
    if (res.ok) {
      const blob = await res.blob();
      const isActuallyHtml = blob.type.includes('text/html') && !/\.(html|htm)$/i.test(safeFilename);
      if (!isActuallyHtml && blob.size > 0) {
        const ok = triggerBlobDownload(blob, safeFilename);
        if (ok) return true;
      }
    }
  } catch (err1) {
    console.warn('Proxy blob download error, attempting hidden iframe and direct fallbacks:', err1);
  }

  // 4. Hidden iframe trigger to /api/proxy-file with Content-Disposition: attachment
  // This is the most reliable browser download mechanism inside iframes and sandboxes!
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.src = proxied;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 45000);
    return true;
  } catch (err2) {
    console.warn('Hidden iframe download trigger error:', err2);
  }

  // 5. Direct URL fetch fallback
  const directUrl = getDirectUrl(url);
  if (directUrl && directUrl !== url && !directUrl.includes('/api/proxy-file')) {
    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          return triggerBlobDownload(blob, safeFilename);
        }
      }
    } catch (err3) {
      console.warn('Direct blob download error:', err3);
    }
  }

  // 6. Final fallback: trigger anchor click
  try {
    const a = document.createElement('a');
    a.href = proxied || directUrl || url;
    a.download = safeFilename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 2000);
    return true;
  } catch (err4) {
    console.error('Semua metode download gagal:', err4);
    return false;
  }
};

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string
) => {
  const img = e.currentTarget;
  const currentSrc = img.src;

  // If failed on proxied URL, fallback to direct original URL
  if (currentSrc.includes('/api/proxy-file')) {
    const directUrl = getDirectUrl(currentSrc) || fallbackUrl;
    if (directUrl && directUrl !== currentSrc) {
      img.src = directUrl;
      return;
    }
  }

  // If directUrl failed as well, or if fallbackUrl provided
  if (fallbackUrl && img.src !== fallbackUrl) {
    img.src = fallbackUrl;
    return;
  }

  // Final fallback SVG placeholder if image cannot be loaded at all
  img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2394a3b8">Gambar Tidak Tersedia</text></svg>`;
};
