const params = new URLSearchParams(window.location.search);
const propertyId = Number(params.get("id"));

const content = document.getElementById("property-content");
const emptyState = document.getElementById("property-empty");
const mainImage = document.getElementById("detail-main-image");
const thumbs = document.getElementById("detail-thumbs");
const prevImage = document.getElementById("detail-prev-image");
const nextImage = document.getElementById("detail-next-image");
const badges = document.getElementById("detail-badges");
const title = document.getElementById("detail-title");
const locationText = document.getElementById("detail-location");
const price = document.getElementById("detail-price");
const features = document.getElementById("detail-features");
const description = document.getElementById("detail-description");
const whatsapp = document.getElementById("detail-whatsapp");

let activeImages = [];
let activeIndex = 0;
let activeTitle = "";

prevImage.addEventListener("click", () => stepGallery(-1));
nextImage.addEventListener("click", () => stepGallery(1));

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    stepGallery(-1);
  }

  if (event.key === "ArrowRight") {
    stepGallery(1);
  }
});

function formatPrice(currency, value) {
  if (currency === "UF") {
    return `UF ${new Intl.NumberFormat("es-CL").format(value)}`;
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFeatureItems(property) {
  const items = [];

  if (property.type) {
    items.push(`Tipo: ${property.type}`);
  }

  if (property.operation) {
    items.push(`Operación: ${property.operation}`);
  }

  if (property.country) {
    items.push(`País: ${property.country}`);
  }

  if (property.bedrooms > 0) {
    items.push(`Dormitorios: ${property.bedrooms}`);
  }

  if (property.bathrooms > 0) {
    items.push(`Baños: ${property.bathrooms}`);
  }

  if (property.area) {
    items.push(`Superficie: ${property.area}`);
  }

  if (property.usableArea) {
    items.push(`Superficie útil: ${property.usableArea}`);
  }

  return items;
}

function renderGallery() {
  mainImage.src = activeImages[activeIndex];
  mainImage.alt = activeTitle;
  thumbs.innerHTML = activeImages
    .map(
      (image, index) => `
        <button type="button" class="${index === activeIndex ? "is-active" : ""}" data-thumb-index="${index}">
          <img src="${image}" alt="${activeTitle} foto ${index + 1}" />
        </button>
      `,
    )
    .join("");

  thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeIndex = Number(button.dataset.thumbIndex);
      renderGallery();
    });
  });
}

function stepGallery(direction) {
  if (!activeImages.length) {
    return;
  }

  activeIndex = (activeIndex + direction + activeImages.length) % activeImages.length;
  renderGallery();
}

function renderProperty(property) {
  const images = Array.isArray(property.images) ? property.images : [];

  activeImages = images.length ? images : ["./assets/hero-property.svg"];
  activeTitle = property.title;
  activeIndex = 0;

  badges.innerHTML = `
    <span class="badge">${property.operation}</span>
    <span class="badge">${property.type}</span>
    <span class="badge">${property.currency}</span>
    <span class="badge">${activeImages.length} foto(s)</span>
  `;
  title.textContent = property.title;
  locationText.textContent = `${property.location}, ${property.country}`;
  price.textContent = formatPrice(property.currency, property.price);
  features.innerHTML = getFeatureItems(property).map((item) => `<span>${item}</span>`).join("");
  description.textContent = property.description || "Sin descripción disponible.";
  whatsapp.href = `https://wa.me/56968673415?text=${encodeURIComponent(`Hola, quiero consultar por esta propiedad: ${property.title} - ${window.location.href}`)}`;

  document.title = `${property.title} | HOMELIT`;
  renderGallery();
  content.classList.remove("hidden");
}

async function initPropertyPage() {
  const properties = await getStoredProperties();
  const property = properties.find((item) => Number(item.id) === propertyId);

  if (!property) {
    emptyState.classList.remove("hidden");
    return;
  }

  renderProperty(property);
}

initPropertyPage();
