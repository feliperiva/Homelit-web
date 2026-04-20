const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "homelit";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Homelit2026!";
const SESSION_COOKIE = "homelit_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const BASE_DIR = __dirname;
const SOURCE_DATA_DIR = path.join(BASE_DIR, "data");
const DATA_DIR = process.env.DATA_DIR || SOURCE_DATA_DIR;
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const PROPERTIES_FILE = path.join(DATA_DIR, "properties.json");

const sessions = new Map();

const SEED_PROPERTIES = [
  {
    id: 1,
    title: "Casa mediterranea con vista al valle",
    country: "Chile",
    location: "Lo Barnechea, Santiago",
    operation: "Venta",
    currency: "UF",
    price: 24500,
    type: "Casa",
    bedrooms: 4,
    bathrooms: 4,
    area: "320 m2",
    usableArea: "280 m2",
    description: "Propiedad de alta categoria con jardin, terraza y excelente conectividad.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: 2,
    title: "Departamento moderno cerca del mar",
    country: "Chile",
    location: "Concon, Valparaiso",
    operation: "Venta",
    currency: "UF",
    price: 8900,
    type: "Departamento",
    bedrooms: 3,
    bathrooms: 2,
    area: "118 m2",
    usableArea: "102 m2",
    description: "Departamento luminoso, cercano a comercio y con vista despejada.",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

ensureDataFiles();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (url.pathname.startsWith("/uploads/")) {
      serveUploads(res, url.pathname);
      return;
    }

    serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: "internal_error", message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`HOMELIT running on http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/properties") {
    sendJson(res, 200, { properties: readProperties() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/session") {
    const session = getSession(req);
    sendJson(res, 200, { authenticated: Boolean(session), username: session?.username || null });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/login") {
    const body = await readJsonBody(req);

    if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: "invalid_credentials" });
      return;
    }

    const token = crypto.randomUUID();
    sessions.set(token, { username: ADMIN_USERNAME, expiresAt: Date.now() + SESSION_TTL_MS });
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
    );
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) {
      sessions.delete(token);
    }
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
    sendJson(res, 200, { ok: true });
    return;
  }

  const session = requireSession(req, res);
  if (!session) {
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/properties") {
    sendJson(res, 200, { properties: readProperties() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/properties") {
    const body = await readJsonBody(req);
    const properties = readProperties();
    const property = await buildStoredProperty(body.property || {}, null);
    properties.unshift(property);
    writeProperties(properties);
    sendJson(res, 200, { property });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/import") {
    const body = await readJsonBody(req);
    const imported = Array.isArray(body.properties) ? body.properties : [];
    const built = [];

    for (const item of imported) {
      built.push(await buildStoredProperty(item, null));
    }

    writeProperties(built);
    sendJson(res, 200, { properties: built });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/reset") {
    writeProperties(SEED_PROPERTIES);
    sendJson(res, 200, { properties: readProperties() });
    return;
  }

  const propertyMatch = pathname.match(/^\/api\/admin\/properties\/(.+)$/);
  if (!propertyMatch) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  const propertyId = Number(propertyMatch[1]);
  const properties = readProperties();
  const currentIndex = properties.findIndex((property) => property.id === propertyId);

  if (currentIndex === -1) {
    sendJson(res, 404, { error: "property_not_found" });
    return;
  }

  if (req.method === "PUT") {
    const body = await readJsonBody(req);
    const updated = await buildStoredProperty(body.property || {}, properties[currentIndex]);
    properties[currentIndex] = updated;
    writeProperties(properties);
    sendJson(res, 200, { property: updated });
    return;
  }

  if (req.method === "DELETE") {
    deleteManagedImages(properties[currentIndex].images);
    properties.splice(currentIndex, 1);
    writeProperties(properties);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
}

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  if (!fs.existsSync(PROPERTIES_FILE)) {
    bootstrapPersistentData();
  }

  if (!fs.existsSync(PROPERTIES_FILE)) {
    fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(SEED_PROPERTIES, null, 2));
  }
}

function bootstrapPersistentData() {
  const sourcePropertiesFile = path.join(SOURCE_DATA_DIR, "properties.json");
  const sourceUploadsDir = path.join(SOURCE_DATA_DIR, "uploads");

  if (fs.existsSync(sourcePropertiesFile)) {
    fs.copyFileSync(sourcePropertiesFile, PROPERTIES_FILE);
  }

  if (fs.existsSync(sourceUploadsDir)) {
    copyDirectory(sourceUploadsDir, UPLOADS_DIR);
  }
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  fs.readdirSync(sourceDir, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      return;
    }

    if (entry.isFile() && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function readProperties() {
  return JSON.parse(fs.readFileSync(PROPERTIES_FILE, "utf8"));
}

function writeProperties(properties) {
  fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2));
}

async function buildStoredProperty(input, previousProperty) {
  const previousImages = previousProperty?.images || [];
  const processedImages = [];

  for (const image of Array.isArray(input.images) ? input.images : []) {
    if (typeof image !== "string") {
      continue;
    }

    if (image.startsWith("data:image/")) {
      processedImages.push(saveDataUrlImage(image));
      continue;
    }

    if (image.startsWith("/uploads/") || image.startsWith("http://") || image.startsWith("https://")) {
      processedImages.push(image);
    }
  }

  const removedImages = previousImages.filter((image) => !processedImages.includes(image));
  deleteManagedImages(removedImages);

  return {
    id: Number(input.id) || Date.now(),
    title: String(input.title || "").trim(),
    country: String(input.country || "").trim(),
    location: String(input.location || "").trim(),
    operation: String(input.operation || "").trim(),
    currency: String(input.currency || "").trim(),
    price: Number(input.price) || 0,
    type: String(input.type || "").trim(),
    bedrooms: Number(input.bedrooms) || 0,
    bathrooms: Number(input.bathrooms) || 0,
    area: String(input.area || "").trim(),
    usableArea: String(input.usableArea || "").trim(),
    description: String(input.description || "").trim(),
    images: processedImages
  };
}

function saveDataUrlImage(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("invalid_image_data");
  }

  const mime = match[1];
  const extension = mimeToExtension(mime);
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(match[2], "base64"));
  return `/uploads/${filename}`;
}

function deleteManagedImages(images) {
  images.forEach((image) => {
    if (!image.startsWith("/uploads/")) {
      return;
    }

    const filepath = path.join(UPLOADS_DIR, path.basename(image));
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  });
}

function mimeToExtension(mime) {
  if (mime === "image/png") {
    return "png";
  }
  if (mime === "image/webp") {
    return "webp";
  }
  return "jpg";
}

function getSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "unauthorized" });
    return null;
  }
  return session;
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = {};

  cookieHeader.split(";").forEach((part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (!key) {
      return;
    }
    cookies[key] = decodeURIComponent(valueParts.join("="));
  });

  return cookies;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 60 * 1024 * 1024) {
        reject(new Error("payload_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function serveUploads(res, pathname) {
  const filepath = path.join(UPLOADS_DIR, path.basename(pathname));
  if (!fs.existsSync(filepath)) {
    sendText(res, 404, "Not found");
    return;
  }
  serveFile(res, filepath);
}

function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filepath = path.join(BASE_DIR, safePath);

  if (!filepath.startsWith(BASE_DIR) || !fs.existsSync(filepath) || fs.statSync(filepath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  serveFile(res, filepath);
}

function serveFile(res, filepath) {
  const extension = path.extname(filepath).toLowerCase();
  const contentType =
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp"
    }[extension] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filepath).pipe(res);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
