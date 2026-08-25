// Thin wrapper around fetch() that always talks to the real Express API.
// Returns a consistent { ok, status, data, error } shape so components don't
// need to know about Response objects or JSON parsing.
export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || json?.success === false) {
    return { ok: false, status: res.status, error: json?.error || `Request failed (${res.status})` };
  }
  return { ok: true, status: res.status, data: json?.data };
}
