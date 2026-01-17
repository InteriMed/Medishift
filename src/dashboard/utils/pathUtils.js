const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

export const normalizePathname = (pathname) => {
  if (!pathname) return '/';
  
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return '/';
  
  const firstSegment = segments[0];
  
  if (SUPPORTED_LANGUAGES.includes(firstSegment)) {
    const remainingPath = segments.slice(1).join('/');
    return remainingPath ? `/${remainingPath}` : '/';
  }
  
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

