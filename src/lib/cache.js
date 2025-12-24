// Shared in-memory cache for API responses
// Used for responses that exceed Next.js's 2MB cache limit

const cache = new Map();
const CACHE_TTL = 86400 * 1000; // 24 hours in milliseconds

export function getCacheKey(url) {
  return url;
}

export function isCacheValid(entry) {
  return entry && (Date.now() - entry.timestamp) < CACHE_TTL;
}

export function get(key) {
  return cache.get(key);
}

export function set(key, value) {
  cache.set(key, {
    data: value,
    timestamp: Date.now(),
  });
  
  // Clean up old cache entries periodically
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp >= CACHE_TTL) {
        cache.delete(k);
      }
    }
  }
}

export function clear() {
  cache.clear();
}

export function clearByPattern(pattern) {
  let clearedCount = 0;
  for (const key of cache.keys()) {
    // Match patterns in the URL path (e.g., '/articles', '/categories')
    // Cache keys are full URLs like 'https://snackmachine.onrender.com/api/articles'
    if (key.includes(pattern)) {
      cache.delete(key);
      clearedCount++;
    }
  }
  if (clearedCount > 0) {
    console.log(`Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
  }
  return clearedCount;
}

// Clear cache for a specific article by slug
export function clearArticle(slug) {
  const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
  const articleUrl = `${EXTERNAL_API_URL}/articles/${slug}`;
  const cacheKey = getCacheKey(articleUrl);
  const deleted = cache.delete(cacheKey);
  if (deleted) {
    console.log(`Cleared cache for article: ${slug}`);
  }
  return deleted;
}

// Clear all article list caches
export function clearAllArticles() {
  const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';
  let clearedCount = 0;
  for (const key of cache.keys()) {
    // Match article list URLs (with or without category filter)
    if (key.includes(`${EXTERNAL_API_URL}/articles`)) {
      cache.delete(key);
      clearedCount++;
    }
  }
  if (clearedCount > 0) {
    console.log(`Cleared ${clearedCount} article cache entries`);
  }
  return clearedCount;
}

