const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

export const API_BASE =
  !rawApiUrl || rawApiUrl.includes('your-worker.workers.dev')
    ? ''
    : rawApiUrl.replace(/\/+$/, '');
