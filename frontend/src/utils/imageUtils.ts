/**
 * Get the full URL for an image
 * Handles both relative and absolute URLs
 */
export const getImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  // If already a full URL (http/https), clean it and return
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Clean duplicate domains from path
    try {
      const urlObj = new URL(imageUrl);
      const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/;
      let pathname = urlObj.pathname;
      const pathParts = pathname.split('/').filter(p => p);
      
      // Remove any domain-like segments from the path
      const cleanedParts = pathParts.filter(part => {
        // Skip domain-like segments (but keep actual path segments)
        return !domainPattern.test(part);
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
      // If URL parsing fails, return as is
      return imageUrl;
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
  
  // Remove leading slash if it's followed by a domain
  if (cleanedUrl.startsWith('/')) {
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/;
    const pathParts = cleanedUrl.split('/').filter(p => p);
    if (pathParts.length > 0 && domainPattern.test(pathParts[0])) {
      // First segment is a domain - remove it
      pathParts.shift();
      cleanedUrl = '/' + pathParts.join('/');
    }
  }
  
  // Check if URL contains a domain name at the start (e.g., prashantthakar.com/api/uploads/...)
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/;
  if (domainPattern.test(cleanedUrl)) {
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
      const pathParts = pathname.split('/').filter(p => p);
      
      // Remove any domain-like segments from the path
      const cleanedParts = pathParts.filter(part => !domainPattern.test(part));
      
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
  
  // Remove any domain-like segments from the beginning of the path
  const pathParts = relativePath.split('/').filter(p => p);
  const cleanedParts = pathParts.filter(part => !domainPattern.test(part));
  relativePath = '/' + cleanedParts.join('/');
  
  // Remove /api from uploads paths
  relativePath = relativePath.replace(/^\/api\/uploads\//, '/uploads/');
  
  // Construct full URL - static files are served directly, not through /api
  const fullUrl = `${baseUrl}${relativePath}`;
  
  return fullUrl;
};
