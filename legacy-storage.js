const HOMELIT_DB_NAME = "homelit-db";
const HOMELIT_DB_VERSION = 1;
const HOMELIT_STORE_NAME = "app";
const HOMELIT_PROPERTIES_KEY = "properties";
const HOMELIT_LEGACY_STORAGE_KEY = "homelit-properties-v1";

let homelitDbPromise;

function openHomelitDb() {
  if (!homelitDbPromise) {
    homelitDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(HOMELIT_DB_NAME, HOMELIT_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(HOMELIT_STORE_NAME)) {
          db.createObjectStore(HOMELIT_STORE_NAME, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return homelitDbPromise;
}

async function readDbValue(key) {
  const db = await openHomelitDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HOMELIT_STORE_NAME, "readonly");
    const store = transaction.objectStore(HOMELIT_STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

async function getLegacyStoredProperties() {
  const stored = await readDbValue(HOMELIT_PROPERTIES_KEY);

  if (Array.isArray(stored) && stored.length) {
    return stored;
  }

  const legacyRaw = window.localStorage.getItem(HOMELIT_LEGACY_STORAGE_KEY);
  if (!legacyRaw) {
    return [];
  }

  try {
    const parsed = JSON.parse(legacyRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}
