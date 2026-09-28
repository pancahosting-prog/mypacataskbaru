export const getProxiedUrl = (originalUrl?: string): string => {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('#') || originalUrl.startsWith('data:')) return originalUrl;
  
  // If already proxied, return as-is
  if (originalUrl.startsWith('/api/proxy-file')) return originalUrl;
  
  // If it is an external URL (ImageKit, Unsplash, external storage), route through server proxy
  if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
    return `/api/proxy-file?url=${encodeURIComponent(originalUrl)}`;
  }
  
  return originalUrl;
};
