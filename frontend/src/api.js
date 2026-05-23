// All API calls go through Vite's proxy → http://localhost:8000
const BASE = "/api";

/**
 * Upload one or more files to the backend.
 * @param {File[]} files
 * @returns {Promise<Array<{filename, chunks_added, total_chunks}>>}
 */
export async function uploadFiles(files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

/**
 * Send a question and receive an answer with sources.
 * @param {string} question
 * @returns {Promise<{answer, sources, chunks_used}>}
 */
export async function sendMessage(question) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

/**
 * Get current index status.
 * @returns {Promise<{status, total_chunks, collection}>}
 */
export async function getStatus() {
  const res = await fetch(`${BASE}/status`);
  if (!res.ok) throw new Error("Status check failed");
  return res.json();
}

/**
 * Clear all indexed documents.
 */
export async function clearDocuments() {
  const res = await fetch(`${BASE}/clear`, { method: "DELETE" });
  if (!res.ok) throw new Error("Clear failed");
  return res.json();
}
