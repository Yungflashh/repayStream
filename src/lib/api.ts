const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

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
