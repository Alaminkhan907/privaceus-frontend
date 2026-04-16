const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }

  return response.json();
}

export async function fetchOverview() {
  return getJson("/overview");
}

export async function fetchInsights() {
  return getJson("/insights");
}
