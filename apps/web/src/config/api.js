// Centralized Web App API & Socket configuration
// Production values are supplied by Vercel environment variables (VITE_API_URL, VITE_SOCKET_URL)

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
