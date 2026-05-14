const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sd_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(access_key: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_key }),
  });
  if (!res.ok) throw new Error("Invalid access key");
  return res.json();
}

export async function listFiles() {
  const res = await fetch(`${BASE_URL}/files`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteFile(filename: string) {
  const res = await fetch(`${BASE_URL}/files/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadFromDrive(storage_type: string, link: string) {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ storage_type, link }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getKV(key: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/kv/${key}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.text();
}

export async function setKV(key: string, value: string) {
  const res = await fetch(`${BASE_URL}/kv/${key}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteKV(key: string) {
  const res = await fetch(`${BASE_URL}/kv/${key}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDebug() {
  const res = await fetch(`${BASE_URL}/debug`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getPartyToken(room: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE_URL}/party-token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function createPartyWebSocket(roomId: string, token: string): WebSocket {
  const wsBase = BASE_URL.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/party/${roomId}`);
  return ws;
}

export { BASE_URL };
