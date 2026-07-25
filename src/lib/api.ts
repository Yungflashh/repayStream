const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Cookies don't work cross-origin (Vercel → Render) in modern browsers due to
// third-party cookie blocking. Store the JWT in localStorage and send it as a
// Bearer token instead. The server already accepts both.
const TOKEN_KEY = "rs_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
