export const getProxiedUrl = (
  originalUrl?: string,
  forceAbsolute = false,
  downloadFilename?: string
): string => {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('#') || originalUrl.startsWith('data:')) return originalUrl;

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
