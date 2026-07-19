export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message ?? "The request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = payload?.error?.code ?? "request_failed";
    this.details = payload?.error?.details;
  }
}

export function createApi(baseUrl = "/api") {
  return {
    getDocument: () => request(`${baseUrl}/document`),
    getSession: () => request(`${baseUrl}/session`),
    enableEditing: (csrfToken) => request(`${baseUrl}/session/edit`, {
      method: "POST",
      csrfToken,
    }),
    login: (password, csrfToken) => request(`${baseUrl}/login`, {
      method: "POST",
      csrfToken,
      body: { password },
    }),
    logout: (csrfToken) => request(`${baseUrl}/logout`, {
      method: "POST",
      csrfToken,
    }),
    saveDocument: (revision, document, csrfToken) => request(`${baseUrl}/document`, {
      method: "PUT",
      csrfToken,
      body: { revision, document },
    }),
    uploadMedia: (file, csrfToken) => upload(`${baseUrl}/media`, file, csrfToken),
    deleteMedia: (id, csrfToken) => request(`${baseUrl}/media/${encodeURIComponent(id)}`, { method: "DELETE", csrfToken }),
    listAttachments: (section) => request(`${baseUrl}/attachments?section=${encodeURIComponent(section)}`),
    uploadAttachment: (section, blockId, file, csrfToken) => uploadFile(
      `${baseUrl}/attachments/${encodeURIComponent(section)}/${encodeURIComponent(blockId)}?name=${encodeURIComponent(file.name)}`,
      file,
      csrfToken,
      "POST",
    ),
    replaceAttachment: (id, file, csrfToken) => uploadFile(
      `${baseUrl}/attachments/${encodeURIComponent(id)}/content?name=${encodeURIComponent(file.name)}`,
      file,
      csrfToken,
      "PUT",
    ),
    renameAttachment: (id, name, csrfToken) => request(`${baseUrl}/attachments/${encodeURIComponent(id)}`, {
      method: "PATCH", csrfToken, body: { name },
    }),
    deleteAttachment: (id, csrfToken) => request(`${baseUrl}/attachments/${encodeURIComponent(id)}`, { method: "DELETE", csrfToken }),
    attachmentContentUrl: (id, preview = false) => `${baseUrl}/attachments/${encodeURIComponent(id)}/content${preview ? "?mode=preview" : ""}`,
    downloadAttachment: (id, password, csrfToken) => downloadFile(
      `${baseUrl}/attachments/${encodeURIComponent(id)}/download`,
      password,
      csrfToken,
    ),
    listTemplates: () => request(`${baseUrl}/custom-templates`),
    createTemplate: (name, template, csrfToken) => request(`${baseUrl}/custom-templates`, {
      method: "POST", csrfToken, body: { name, template },
    }),
    updateTemplate: (id, revision, name, template, csrfToken) => request(`${baseUrl}/custom-templates/${encodeURIComponent(id)}`, {
      method: "PUT", csrfToken, body: { revision, name, template },
    }),
    deleteTemplate: (id, revision, csrfToken) => request(`${baseUrl}/custom-templates/${encodeURIComponent(id)}`, {
      method: "DELETE", csrfToken, body: { revision },
    }),
  };
}

async function request(url, options = {}) {
  const headers = { Accept: "application/json" };
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.csrfToken) headers["X-CSRF-Token"] = options.csrfToken;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    credentials: "same-origin",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

async function upload(url, file, csrfToken) {
  return uploadFile(url, file, csrfToken, "POST");
}

async function uploadFile(url, file, csrfToken, method) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": file.type || "application/octet-stream", "X-CSRF-Token": csrfToken, Accept: "application/json" },
    credentials: "same-origin",
    body: file,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

async function downloadFile(url, password, csrfToken) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken, Accept: "application/octet-stream" },
    credentials: "same-origin",
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload);
  }
  return response.blob();
}
