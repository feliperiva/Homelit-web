async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || payload.error || "request_failed";
    throw new Error(message);
  }

  return payload;
}

async function getStoredProperties() {
  const payload = await apiRequest("/api/properties", { method: "GET" });
  return payload.properties || [];
}

async function getAdminSession() {
  return apiRequest("/api/admin/session", { method: "GET" });
}

async function loginAdmin(username, password) {
  return apiRequest("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

async function logoutAdmin() {
  return apiRequest("/api/admin/logout", {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function getAdminProperties() {
  const payload = await apiRequest("/api/admin/properties", { method: "GET" });
  return payload.properties || [];
}

async function createAdminProperty(property) {
  const payload = await apiRequest("/api/admin/properties", {
    method: "POST",
    body: JSON.stringify({ property })
  });
  return payload.property;
}

async function updateAdminProperty(property) {
  const payload = await apiRequest(`/api/admin/properties/${property.id}`, {
    method: "PUT",
    body: JSON.stringify({ property })
  });
  return payload.property;
}

async function deleteAdminProperty(id) {
  return apiRequest(`/api/admin/properties/${id}`, {
    method: "DELETE"
  });
}

async function resetStoredProperties() {
  const payload = await apiRequest("/api/admin/reset", {
    method: "POST",
    body: JSON.stringify({})
  });
  return payload.properties || [];
}

async function replaceStoredProperties(properties) {
  await apiRequest("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({ properties })
  });
}

async function importStoredPropertiesOneByOne(properties) {
  await apiRequest("/api/admin/import", {
    method: "POST",
    body: JSON.stringify({ properties: [] })
  });

  const imported = [];

  for (const property of properties) {
    const created = await createAdminProperty(property);
    imported.push(created);
  }

  return imported;
}
