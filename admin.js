const IMAGE_MAX_WIDTH = 1600;
const IMAGE_MAX_HEIGHT = 1200;
const IMAGE_QUALITY = 0.78;

const loginView = document.getElementById("login-view");
const panelView = document.getElementById("panel-view");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");
const propertyForm = document.getElementById("property-form");
const propertyList = document.getElementById("property-admin-list");
const imagePreviewGrid = document.getElementById("image-preview-grid");
const uploadCount = document.getElementById("upload-count");
const uploadFileList = document.getElementById("upload-file-list");
const imageWarningMessage = document.getElementById("image-warning-message");
const formMessage = document.getElementById("form-message");
const formTitle = document.getElementById("form-title");
const resetFormButton = document.getElementById("reset-form-button");
const resetSeedButton = document.getElementById("reset-seed-button");
const importBackupFile = document.getElementById("import-backup-file");

const fields = {
  id: document.getElementById("property-id"),
  title: document.getElementById("property-title"),
  country: document.getElementById("property-country"),
  location: document.getElementById("property-location"),
  operation: document.getElementById("property-operation"),
  currency: document.getElementById("property-currency"),
  price: document.getElementById("property-price"),
  type: document.getElementById("property-type"),
  bedrooms: document.getElementById("property-bedrooms"),
  bathrooms: document.getElementById("property-bathrooms"),
  area: document.getElementById("property-area"),
  usableArea: document.getElementById("property-usable-area"),
  description: document.getElementById("property-description"),
  images: document.getElementById("property-images")
};

let workingProperties = [];
let stagedImages = [];
let stagedFileNames = [];

initAdmin();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await loginAdmin(
      document.getElementById("login-user").value.trim(),
      document.getElementById("login-password").value
    );
    loginMessage.textContent = "";
    await loadAdminData();
    showPanel(true);
  } catch (error) {
    loginMessage.textContent = "Usuario o contraseña incorrectos.";
  }
});

logoutButton.addEventListener("click", async () => {
  await logoutAdmin();
  showPanel(false);
});

fields.images.addEventListener("change", async () => {
  const selectedFiles = Array.from(fields.images.files);
  const compatibleFiles = selectedFiles.filter(isCompatibleImageFile);
  const incompatibleFiles = selectedFiles.filter((file) => !isCompatibleImageFile(file));

  imageWarningMessage.textContent = compatibleFiles.length
    ? "Procesando y optimizando imagenes..."
    : "";

  const optimizedImages = await Promise.all(compatibleFiles.map((file) => optimizeImageFile(file)));
  stagedImages = [...stagedImages, ...optimizedImages];
  stagedFileNames = [...stagedFileNames, ...compatibleFiles.map((file) => file.name)];

  renderUploadSummary(stagedFileNames);
  renderImagePreview(stagedImages);
  renderImageWarning(incompatibleFiles);
  fields.images.value = "";
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const property = {
    id: Number(fields.id.value) || Date.now(),
    title: fields.title.value.trim(),
    country: fields.country.value,
    location: fields.location.value.trim(),
    operation: fields.operation.value,
    currency: fields.currency.value,
    price: Number(fields.price.value),
    type: fields.type.value,
    bedrooms: Number(fields.bedrooms.value || 0),
    bathrooms: Number(fields.bathrooms.value || 0),
    area: fields.area.value.trim(),
    usableArea: fields.usableArea.value.trim(),
    description: fields.description.value.trim(),
    images: stagedImages.map((image) => image.url)
  };

  try {
    if (fields.id.value) {
      await updateAdminProperty(property);
    } else {
      await createAdminProperty(property);
    }

    formMessage.textContent = "Propiedad guardada correctamente.";
    await loadAdminData();
    resetForm();
  } catch (error) {
    formMessage.textContent = "No se pudo guardar la propiedad.";
  }
});

resetFormButton.addEventListener("click", () => resetForm());

resetSeedButton.addEventListener("click", async () => {
  workingProperties = await resetStoredProperties();
  renderPropertyList();
  resetForm();
});

importBackupFile.addEventListener("change", async () => {
  const file = importBackupFile.files[0];
  if (!file) {
    return;
  }

  try {
    formMessage.textContent = "Importando respaldo...";
    const text = await file.text();
    const parsed = JSON.parse(text);
    const backupProperties = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.properties)
        ? parsed.properties
        : null;

    if (!backupProperties) {
      throw new Error("invalid_backup_format");
    }

    if (!backupProperties.length) {
      formMessage.textContent = "El respaldo no contiene propiedades para importar.";
      importBackupFile.value = "";
      return;
    }

    workingProperties = await importStoredPropertiesOneByOne(backupProperties);
    renderPropertyList();
    resetForm();
    formMessage.textContent = `Respaldo importado correctamente. ${workingProperties.length} propiedad(es) cargada(s).`;
  } catch (error) {
    formMessage.textContent =
      error.message === "invalid_backup_format"
        ? "El archivo no tiene un formato valido de respaldo."
        : "No se pudo importar el respaldo.";
  } finally {
    importBackupFile.value = "";
  }
});

async function initAdmin() {
  const session = await getAdminSession();
  const authenticated = Boolean(session.authenticated);
  showPanel(authenticated);

  if (authenticated) {
    await loadAdminData();
  }
}

async function loadAdminData() {
  workingProperties = await getAdminProperties();
  renderPropertyList();
  renderUploadSummary([]);
}

function showPanel(isAuthenticated) {
  loginView.classList.toggle("hidden", isAuthenticated);
  panelView.classList.toggle("hidden", !isAuthenticated);
}

function renderPropertyList() {
  if (!workingProperties.length) {
    propertyList.innerHTML = "<p class='helper-text'>Aun no hay propiedades cargadas.</p>";
    return;
  }

  propertyList.innerHTML = workingProperties
    .map((property) => {
      const mainImage = property.images[0] || "./assets/hero-property.svg";

      return `
        <article class="property-admin-item">
          <div class="property-admin-meta">
            <img src="${mainImage}" alt="${property.title}" />
            <div class="property-admin-info">
              <h4>${property.title}</h4>
              <p>${property.type} • ${property.operation}</p>
              <p>${property.location}</p>
              <p>${property.images.length} foto(s)</p>
            </div>
          </div>
          <div class="property-admin-actions">
            <button class="ghost-button" type="button" data-action="edit" data-id="${property.id}">Editar</button>
            <button class="ghost-button" type="button" data-action="delete" data-id="${property.id}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");

  propertyList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const propertyId = Number(button.dataset.id);

      if (button.dataset.action === "edit") {
        loadPropertyIntoForm(propertyId);
        return;
      }

      await deleteAdminProperty(propertyId);
      await loadAdminData();
      resetForm();
    });
  });
}

function loadPropertyIntoForm(propertyId) {
  const property = workingProperties.find((item) => item.id === propertyId);
  if (!property) {
    return;
  }

  fields.id.value = property.id;
  fields.title.value = property.title;
  fields.country.value = property.country;
  fields.location.value = property.location;
  fields.operation.value = property.operation;
  fields.currency.value = property.currency;
  fields.price.value = property.price;
  fields.type.value = property.type;
  fields.bedrooms.value = property.bedrooms;
  fields.bathrooms.value = property.bathrooms;
  fields.area.value = property.area;
  fields.usableArea.value = property.usableArea || "";
  fields.description.value = property.description || "";

  stagedImages = property.images.map((url, index) => ({
    url,
    name: `Foto guardada ${index + 1}`,
    isNew: false
  }));
  stagedFileNames = stagedImages.map((image) => image.name);
  renderUploadSummary(stagedFileNames);
  renderImagePreview(stagedImages);
  renderImageWarning([]);
  formTitle.textContent = "Editar propiedad";
  formMessage.textContent = "Editando propiedad existente.";
}

function resetForm() {
  propertyForm.reset();
  fields.id.value = "";
  fields.country.value = "Chile";
  fields.operation.value = "Venta";
  fields.currency.value = "UF";
  fields.type.value = "Casa";
  fields.bedrooms.value = 0;
  fields.bathrooms.value = 0;
  fields.area.value = "";
  fields.usableArea.value = "";
  stagedImages = [];
  stagedFileNames = [];
  renderUploadSummary([]);
  renderImagePreview([]);
  renderImageWarning([]);
  formTitle.textContent = "Nueva propiedad";
  formMessage.textContent = "";
}

function renderUploadSummary(fileNames) {
  uploadCount.textContent = `${fileNames.length} archivo(s) cargado(s)`;
  uploadFileList.innerHTML = fileNames.length
    ? fileNames.map((fileName) => `<span class="upload-file-tag">${fileName}</span>`).join("")
    : "<span class='helper-text'>Aun no hay imagenes seleccionadas.</span>";
}

function renderImagePreview(images) {
  imagePreviewGrid.innerHTML = images
    .map(
      (image, index) => `
        <div class="preview-card">
          <img src="${image.url}" alt="Vista previa ${index + 1}" />
          <button class="preview-remove" type="button" data-preview-index="${index}" aria-label="Eliminar foto ${index + 1}">×</button>
        </div>
      `
    )
    .join("");

  imagePreviewGrid.querySelectorAll(".preview-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.previewIndex);
      stagedImages = stagedImages.filter((_, itemIndex) => itemIndex !== index);
      stagedFileNames = stagedFileNames.filter((_, itemIndex) => itemIndex !== index);
      renderUploadSummary(stagedFileNames);
      renderImagePreview(stagedImages);
    });
  });
}

function renderImageWarning(files) {
  imageWarningMessage.textContent = files.length
    ? `Estos archivos no se cargaron porque el navegador no los puede mostrar bien: ${files
        .map((file) => file.name)
        .join(", ")}. Usa JPG, PNG o WEBP.`
    : "";
}

function isCompatibleImageFile(file) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function optimizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      optimizeImageDataUrl(reader.result)
        .then((url) => resolve({ url, name: file.name, isNew: true }))
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function optimizeImageDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_WIDTH / image.naturalWidth, IMAGE_MAX_HEIGHT / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}
