let properties = [];

const grid = document.getElementById("property-grid");
const resultsCount = document.getElementById("results-count");
const tabs = document.querySelectorAll(".filter-tab");
const panels = document.querySelectorAll(".filter-panel");
const runSearchButton = document.getElementById("run-search");
const navDropdown = document.querySelector(".nav-dropdown");
const navToggle = document.getElementById("nav-properties-toggle");
const locationSuggestions = document.getElementById("location-suggestions");
let locationOptions = [];

const filters = {
  country: document.getElementById("country-filter"),
  location: document.getElementById("location-filter"),
  operation: document.getElementById("operation-filter"),
  currency: document.getElementById("currency-filter"),
  minPrice: document.getElementById("min-price-filter"),
  maxPrice: document.getElementById("max-price-filter"),
  type: document.getElementById("type-filter"),
};

const navFilters = {
  type: document.getElementById("nav-type-filter"),
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.panel;

    tabs.forEach((item) => item.classList.remove("is-active"));
    panels.forEach((panel) => panel.classList.remove("is-visible"));

    tab.classList.add("is-active");
    document.getElementById(target).classList.add("is-visible");
  });
});

Object.values(filters).forEach((field) => {
  field.addEventListener("input", () => applyFilters());
  field.addEventListener("change", () => applyFilters());
});

filters.location.addEventListener("input", () => {
  renderLocationSuggestions(filters.location.value);
});

filters.location.addEventListener("focus", () => {
  renderLocationSuggestions(filters.location.value);
});

filters.location.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideLocationSuggestions();
  }
});

runSearchButton.addEventListener("click", () => {
  applyFilters();
  document.getElementById("propiedades").scrollIntoView({ behavior: "smooth" });
});

navToggle.addEventListener("click", () => {
  navDropdown.classList.toggle("is-open");
});

navFilters.type.addEventListener("change", () => {
  if (!navFilters.type.value) {
    return;
  }

  clearMainFilters();
  filters.type.value = navFilters.type.value;
  applyFilters();
  navDropdown.classList.remove("is-open");
  document.getElementById("propiedades").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("click", (event) => {
  if (!navDropdown.contains(event.target)) {
    navDropdown.classList.remove("is-open");
  }

  if (event.target !== filters.location && !locationSuggestions.contains(event.target)) {
    hideLocationSuggestions();
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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildLocationOptions(list) {
  const options = new Map();

  list.forEach((property) => {
    const parts = property.location
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    [property.location, ...parts].forEach((item) => {
      const normalized = normalizeSearchText(item);

      if (!normalized || options.has(normalized)) {
        return;
      }

      options.set(normalized, item);
    });
  });

  return Array.from(options.values()).sort((a, b) => a.localeCompare(b, "es"));
}

function renderLocationSuggestions(rawValue) {
  const query = normalizeSearchText(rawValue);

  if (!query) {
    hideLocationSuggestions();
    return;
  }

  const matches = locationOptions
    .filter((option) => normalizeSearchText(option).includes(query))
    .slice(0, 8);

  if (!matches.length) {
    hideLocationSuggestions();
    return;
  }

  locationSuggestions.innerHTML = matches
    .map(
      (option) => `
        <button class="location-suggestion" type="button" data-location-option="${option}">
          ${option}
        </button>
      `,
    )
    .join("");

  locationSuggestions.classList.remove("hidden");

  locationSuggestions.querySelectorAll(".location-suggestion").forEach((button) => {
    button.addEventListener("click", () => {
      filters.location.value = button.dataset.locationOption;
      hideLocationSuggestions();
      applyFilters();
    });
  });
}

function hideLocationSuggestions() {
  locationSuggestions.classList.add("hidden");
  locationSuggestions.innerHTML = "";
}

function matchesFilters(property) {
  const locationQuery = normalizeSearchText(filters.location.value);
  const minPrice = Number(filters.minPrice.value);
  const maxPrice = Number(filters.maxPrice.value);
  const normalizedLocation = normalizeSearchText(property.location);

  return (
    (!filters.country.value || property.country === filters.country.value) &&
    (!locationQuery || normalizedLocation.includes(locationQuery)) &&
    (!filters.operation.value || property.operation === filters.operation.value) &&
    (!filters.currency.value || property.currency === filters.currency.value) &&
    (!filters.type.value || property.type === filters.type.value) &&
    (!minPrice || property.price >= minPrice) &&
    (!maxPrice || property.price <= maxPrice)
  );
}

function getFeatureLine(property) {
  const parts = [];

  if (property.bedrooms > 0) {
    parts.push(`${property.bedrooms} Dorm.`);
  }

  if (property.bathrooms > 0) {
    parts.push(`${property.bathrooms} Baños`);
  }

  if (property.area) {
    parts.push(property.area);
  }

  if (property.usableArea) {
    parts.push(`Util: ${property.usableArea}`);
  }

  return parts.join(" • ");
}

function getShortDescription(description) {
  if (!description) {
    return "";
  }

  if (description.length <= 120) {
    return description;
  }

  return `${description.slice(0, 117).trim()}...`;
}

function renderProperties(list) {
  updateResultsCount(list.length);

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No encontramos propiedades con esos filtros</h3>
        <p>Prueba cambiando ubicación, precio, operación o tipo de propiedad.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((property) => {
      const images = Array.isArray(property.images) ? property.images : [];
      const mainImage = images[0] || "./assets/hero-property.svg";
      const featureLine = getFeatureLine(property);

      return `
        <a class="property-card" href="./propiedad.html?id=${property.id}" data-property-id="${property.id}">
          <img src="${mainImage}" alt="${property.title}" />
          <div class="property-body">
            <div class="property-meta">
              <span class="badge">${property.operation}</span>
              <span class="badge">${property.type}</span>
              <span class="badge">${property.currency}</span>
              <span class="badge">${images.length} foto(s)</span>
            </div>
            <h3>${property.title}</h3>
            <p class="property-location">${property.location}, ${property.country}</p>
            <p class="property-price">${formatPrice(property.currency, property.price)}</p>
            ${featureLine ? `<div class="property-features"><span>${featureLine}</span></div>` : ""}
            ${property.description ? `<p class="property-description">${getShortDescription(property.description)}</p>` : ""}
          </div>
        </a>
      `;
    })
    .join("");
}

function updateResultsCount(filteredCount) {
  const hasActiveFilters = Object.values(filters).some((field) => field.value.trim());

  if (!hasActiveFilters) {
    resultsCount.textContent = "215 propiedades encontradas";
    return;
  }

  resultsCount.textContent = `${filteredCount} ${filteredCount === 1 ? "propiedad encontrada" : "propiedades encontradas"}`;
}

function clearMainFilters() {
  filters.country.value = "";
  filters.location.value = "";
  filters.operation.value = "";
  filters.currency.value = "";
  filters.minPrice.value = "";
  filters.maxPrice.value = "";
  filters.type.value = "";
  navFilters.type.value = "";
}

function applyFilters() {
  renderProperties(properties.filter(matchesFilters));
}

initPage();

async function initPage() {
  properties = await getStoredProperties();
  locationOptions = buildLocationOptions(properties);
  renderProperties(properties);
}
