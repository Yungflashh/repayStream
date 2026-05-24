const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const getToken = () => localStorage.getItem("token");
export const setToken = (t: string) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

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
