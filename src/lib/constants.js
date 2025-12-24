// Direct API URL for admin operations (POST, PUT, DELETE)
export const API_BASE_URL = process.env.NEXT_PUBLIC_ARTICLES_API_URL || 'https://snackmachine.onrender.com/api';

// Cached API URL for client-side reads (GET operations)
export const CACHED_API_BASE_URL = '/api/cached'; 