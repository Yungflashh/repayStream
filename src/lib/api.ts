const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

// Token is stored exclusively in the httpOnly cookie set by the server.
// We do NOT store it in localStorage (XSS-accessible).
// These stubs are kept so import sites don't break during the transition.
export const getToken = () => null;
export const setToken = (_t: string) => {};
export const clearToken = () => {};

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers as Record<string, string>),
    },
  });
}
