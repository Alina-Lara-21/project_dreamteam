/**
 * Build an API URL for fetch(). Uses same-origin paths when VITE_API_URL is unset
 * (FastAPI serves the built app). For `vite dev`, set VITE_API_URL=http://127.0.0.1:8000.
 */
export function apiUrl(path: string): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const base = raw?.trim().replace(/\/$/, "") ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
