/**
 * Central API Configuration for PeopleHub
 * In Production (Render/Vercel), set NEXT_PUBLIC_API_URL to the deployed backend URL (e.g. https://peoplehub-api.onrender.com)
 * In Development, falls back to http://localhost:3001
 */
export const API_BASE_URL = 
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')) || 
  'http://localhost:3001';
