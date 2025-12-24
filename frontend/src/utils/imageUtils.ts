/**
 * Get the full URL for an image
 * Handles both relative and absolute URLs
 */
export const getImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  // First, aggressively clean any malformed URLs with duplicate domains in the path
  // This handles cases like: https://crm.prashantthakar.com/.prashantthakar.com/api/uploads/...
  if (imageUrl.includes('://')) {
    // It's a full URL - check for duplicate domains in path
    try {
      const urlObj = new URL(imageUrl);
      const hostname = urlObj.hostname;
      let pathname = urlObj.pathname;
      
      // Extract root domain from hostname (e.g., "prashantthakar.com" from "crm.prashantthakar.com")
      const hostnameParts = hostname.split('.');
      const rootDomain = hostnameParts.length >= 2 
        ? hostnameParts.slice(-2).join('.') 
        : hostname;
      
      // More aggressive cleaning: Remove any domain-like segment from path (with or without leading dot)
      // This handles: /.prashantthakar.com/api/uploads/... or /prashantthakar.com/api/uploads/...
      const domainPattern = /^\/\.?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/;
      if (domainPattern.test(pathname)) {
        // Check if the domain in path matches the hostname or root domain
        const match = pathname.match(/^\/\.?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/);
        if (match) {
          const domainInPath = match[0].replace(/^\/\.?/, '');
          const domainInPathParts = domainInPath.split('.');
          const rootDomainInPath = domainInPathParts.length >= 2 
            ? domainInPathParts.slice(-2).join('.') 
            : domainInPath;
          
          // If domains match, remove the domain segment from path
          if (rootDomainInPath === rootDomain || domainInPath === hostname || 
              domainInPath.includes(hostname) || hostname.includes(domainInPath) ||
              hostname.includes(rootDomainInPath) || rootDomainInPath.includes(rootDomain)) {
            pathname = pathname.replace(/^\/\.?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/, '/');
            urlObj.pathname = pathname;
            imageUrl = urlObj.toString();
          }
        }
      }
      
      // Also check for domain segments anywhere in the path (not just at start)
      const pathParts = pathname.split('/').filter(p => p);
      const cleanedParts = pathParts.filter(part => {
        const cleanPart = part.startsWith('.') ? part.substring(1) : part;
        const domainPattern2 = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (domainPattern2.test(cleanPart)) {
          const domainParts = cleanPart.split('.');
          const rootDomainInPart = domainParts.length >= 2 
            ? domainParts.slice(-2).join('.') 
            : cleanPart;
          // Remove if it matches the hostname or root domain
          return !(rootDomainInPart === rootDomain || cleanPart === hostname || 
                   cleanPart.includes(hostname) || hostname.includes(cleanPart) ||
                   hostname.includes(rootDomainInPart) || rootDomainInPart.includes(rootDomain));
        }
        return true;
      });
      
      if (cleanedParts.length !== pathParts.length) {
        urlObj.pathname = '/' + cleanedParts.join('/');
        imageUrl = urlObj.toString();
      }
    } catch (e) {
      // If URL parsing fails, try aggressive string replacement
      // Remove any domain-like segment from path (with or without leading dot)
      imageUrl = imageUrl.replace(/\/\.?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/g, '/');
    }
  }
  
  // If already a full URL (http/https), clean it and return
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Clean duplicate domains from path
    try {
      const urlObj = new URL(imageUrl);
      const domainPattern3 = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      let pathname = urlObj.pathname;
      
      // Remove leading dot-domain patterns (e.g., /.prashantthakar.com or /.prashantthakar.com/)
      // This regex handles both with and without trailing slash
      pathname = pathname.replace(/^\/\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/, '/');
      
      const pathParts = pathname.split('/').filter(p => p);
      
      // Remove any domain-like segments from the path (including those with leading dots)
      const cleanedParts = pathParts.filter(part => {
        // Skip domain-like segments (with or without leading dot)
        const cleanPart = part.startsWith('.') ? part.substring(1) : part;
        return !domainPattern3.test(cleanPart);
      });
      
      if (cleanedParts.length !== pathParts.length) {
        urlObj.pathname = '/' + cleanedParts.join('/');
        // Remove /api from uploads paths
        urlObj.pathname = urlObj.pathname.replace(/\/api\/uploads(\/|$)/g, '/uploads$1');
        return urlObj.toString();
      }
      
      // Remove /api from uploads paths
      urlObj.pathname = urlObj.pathname.replace(/\/api\/uploads(\/|$)/g, '/uploads$1');
      return urlObj.toString();
    } catch (e) {
      // If URL parsing fails, try manual cleaning
      let cleaned = imageUrl;
      // Remove .prashantthakar.com or similar from path (with or without trailing slash)
      cleaned = cleaned.replace(/\/\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/g, '/');
      cleaned = cleaned.replace(/\/api\/uploads(\/|$)/g, '/uploads$1');
      return cleaned;
    }
  }
  
  // If it's a data URL (base64), return as is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // Clean the URL first - remove leading dots and domain-like segments
  let cleanedUrl = imageUrl.trim();
  
  // Remove leading dot if present (e.g., .prashanttthakar.com -> prashanttthakar.com)
  if (cleanedUrl.startsWith('.')) {
    cleanedUrl = cleanedUrl.substring(1);
  }
  
  // Remove leading slash if it's followed by a domain (with or without leading dot)
  if (cleanedUrl.startsWith('/')) {
    const domainPattern4 = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    // Remove .domain.com pattern from start of path (with or without trailing slash)
    cleanedUrl = cleanedUrl.replace(/^\/\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/, '/');
    
    const pathParts = cleanedUrl.split('/').filter(p => p);
    if (pathParts.length > 0) {
      // Check if first part is a domain (with or without leading dot)
      const firstPart = pathParts[0].startsWith('.') ? pathParts[0].substring(1) : pathParts[0];
      if (domainPattern4.test(firstPart)) {
        // First segment is a domain - remove it
        pathParts.shift();
        cleanedUrl = '/' + pathParts.join('/');
      }
    }
  }
  
  // Check if URL contains a domain name at the start (e.g., prashantthakar.com/api/uploads/...)
  const domainPattern5 = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (domainPattern5.test(cleanedUrl)) {
    // URL starts with a domain name - add protocol if missing
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const protocol = isProduction ? 'https://' : 'http://';
    
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      cleanedUrl = protocol + cleanedUrl;
    }
    
    // Fix common issues: remove /api from uploads paths
    cleanedUrl = cleanedUrl.replace(/\/api\/uploads(\/|$)/g, '/uploads$1');
    
    // Handle duplicate domains in path
    try {
      const urlObj = new URL(cleanedUrl);
      let pathname = urlObj.pathname;
      
      // Remove leading dot-domain patterns (e.g., /.prashantthakar.com or /.prashantthakar.com/)
      pathname = pathname.replace(/^\/\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/, '/');
      
      const pathParts = pathname.split('/').filter(p => p);
      
      // Remove any domain-like segments from the path (including those with leading dots)
      const cleanedParts = pathParts.filter(part => {
        const cleanPart = part.startsWith('.') ? part.substring(1) : part;
        return !domainPattern5.test(cleanPart);
      });
      
      if (cleanedParts.length !== pathParts.length) {
        urlObj.pathname = '/' + cleanedParts.join('/');
        cleanedUrl = urlObj.toString();
      }
    } catch (e) {
      console.warn('Failed to parse URL:', cleanedUrl, e);
    }
    
    return cleanedUrl;
  }
  
  // Construct full URL from relative path
  // For /uploads paths, we need the backend server URL WITHOUT /api
  let apiBase = import.meta.env.VITE_API_BASE_URL;
  
  // If not set, try to detect from current location
  if (!apiBase) {
    // Check if we're in development (localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Try common development ports
      const port = window.location.port;
      if (port === '5173' || port === '3000') {
        // Frontend is on 5173 or 3000, backend likely on 3001
        apiBase = 'http://localhost:3001/api';
      } else {
        apiBase = `http://localhost:${port}/api`;
      }
    } else {
      // Production - use same origin
      apiBase = `${window.location.origin}/api`;
    }
  }
  
  // Remove /api to get base server URL (e.g., http://localhost:3001)
  let baseUrl = apiBase.replace('/api', '').replace(/\/$/, ''); // Also remove trailing slash
  
  // If baseUrl is empty or just the origin, use origin directly
  if (!baseUrl || baseUrl === window.location.origin) {
    baseUrl = window.location.origin;
  }
  
  // Clean up the relative path
  let relativePath = cleanedUrl.startsWith('/') ? cleanedUrl : `/${cleanedUrl}`;
  
  // Remove leading dot-domain patterns (e.g., /.prashantthakar.com or /.prashantthakar.com/)
  relativePath = relativePath.replace(/^\/\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/|$)/, '/');
  
  // Remove any domain-like segments from the beginning of the path (including dot-domains)
  const pathParts = relativePath.split('/').filter(p => p);
  const domainPattern6 = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const cleanedParts = pathParts.filter(part => {
    const cleanPart = part.startsWith('.') ? part.substring(1) : part;
    return !domainPattern6.test(cleanPart);
  });
  relativePath = '/' + cleanedParts.join('/');
  
  // Remove /api from uploads paths
  relativePath = relativePath.replace(/^\/api\/uploads\//, '/uploads/');
  
  // Construct full URL - static files are served directly, not through /api
  const fullUrl = `${baseUrl}${relativePath}`;
  
  return fullUrl;
};
