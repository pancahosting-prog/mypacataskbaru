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
