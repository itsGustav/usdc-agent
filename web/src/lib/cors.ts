export const PUBLIC_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const RESTRICTED_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://paylobster.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

// Backward compatibility alias
export const corsHeaders = PUBLIC_CORS_HEADERS;

export const CACHE_HEADERS = {
  SHORT: 'public, s-maxage=60, stale-while-revalidate=300',
  LONG: 'public, s-maxage=300, stale-while-revalidate=600',
  NO_CACHE: 'no-store, must-revalidate',
};
