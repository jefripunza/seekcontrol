// Global variables
let currentStep = "logs";
let selectedDate = "";
let selectedId = "";
let map = null;
let markers = [];
let polyline = null;

// DOM Elements (will be initialized after DOM loads)
let loading,
  error,
  errorMessage,
  logsSection,
  idsSection,
  mapSection,
  breadcrumb;

// Initialize DOM elements
function initializeDOMElements() {
  loading = document.getElementById("loading");
  error = document.getElementById("error");
  errorMessage = document.getElementById("errorMessage");
  logsSection = document.getElementById("logsSection");
  idsSection = document.getElementById("idsSection");
  mapSection = document.getElementById("mapSection");
  breadcrumb = document.getElementById("breadcrumb");

  // Check if all elements exist
  if (
    !loading ||
    !error ||
    !errorMessage ||
    !logsSection ||
    !idsSection ||
    !mapSection ||
    !breadcrumb
  ) {
    console.error("Some DOM elements are missing!");
    return false;
  }
  return true;
}

// API Functions
async function fetchAPI(endpoint) {
  try {
    showLoading();
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    hideLoading();
    return data;
  } catch (err) {
    hideLoading();
    showError(`Failed to fetch data: ${err.message}`);
    throw err;
  }
}

// UI Helper Functions
function showLoading() {
  if (loading) loading.classList.remove("hidden");
  if (error) error.classList.add("hidden");
}

function hideLoading() {
  if (loading) loading.classList.add("hidden");
}

function showError(message) {
  if (error) error.classList.remove("hidden");
  if (errorMessage) errorMessage.textContent = message;
  hideLoading();
}

function hideError() {
  if (error) error.classList.add("hidden");
}

function updateBreadcrumb(step) {
  currentStep = step;
  if (!breadcrumb) return;

  const items = breadcrumb.querySelectorAll(".breadcrumb-item");
  items.forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.step === step) {
      item.classList.add("active");
    }
  });
}

function showSection(sectionName) {
  // Hide all sections
  if (logsSection) logsSection.classList.add("hidden");
  if (idsSection) idsSection.classList.add("hidden");
  if (mapSection) mapSection.classList.add("hidden");

  // Show selected section
  switch (sectionName) {
    case "logs":
      if (logsSection) logsSection.classList.remove("hidden");
      updateBreadcrumb("logs");
      break;
    case "ids":
      if (idsSection) idsSection.classList.remove("hidden");
      updateBreadcrumb("ids");
      break;
    case "map":
      if (mapSection) mapSection.classList.remove("hidden");
      updateBreadcrumb("map");
      break;
  }

  hideError();
}

// Logs Functions
async function loadLogs() {
  try {
    const response = await fetchAPI("/api/logs");
    displayLogs(response.data);
  } catch (err) {
    console.error("Failed to load logs:", err);
  }
}

function displayLogs(logs) {
  const tbody = document.getElementById("logsTableBody");
  tbody.innerHTML = "";

  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="text-center">No logs available</td></tr>';
    return;
  }

  logs.forEach((date) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${formatDate(date)}</td>
            <td>
                <button onclick="viewDate('${date}')" class="btn btn-success">
                    👁️ View IDs
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function formatDate(dateString) {
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateString;
}

// IDs Functions
async function viewDate(date) {
  selectedDate = date;
  document.getElementById("selectedDate").textContent = formatDate(date);

  try {
    const response = await fetchAPI(`/api/log/${date}`);
    displayIds(response.data);
    showSection("ids");
  } catch (err) {
    console.error("Failed to load IDs:", err);
  }
}

function displayIds(ids) {
  const tbody = document.getElementById("idsTableBody");
  tbody.innerHTML = "";

  if (ids.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="text-center">No participants found</td></tr>';
    return;
  }

  ids.forEach(({ id, name }) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td><code>${id}</code></td>
            <td>${name}</td>
            <td>
                <button onclick="viewMap('${id}')" class="btn btn-success">
                    🗺️ View Map
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Map Functions
async function viewMap(id) {
  selectedId = id;
  document.getElementById("selectedId").textContent = id;

  try {
    const response = await fetchAPI(`/api/log/${selectedDate}/${id}`);
    displayMap(response.data);
    showSection("map");
  } catch (err) {
    console.error("Failed to load participant data:", err);
  }
}

function displayMap(participantData) {
  // Display participant info
  displayParticipantInfo(participantData);

  // Initialize map if not already done
  if (!map) {
    initializeMap();
  }

  // Clear existing markers and polyline
  clearMapData();

  // Add markers and path
  if (participantData.maps && participantData.maps.length > 0) {
    addMarkersToMap(participantData.maps);
    displayLocationStats(participantData.maps);
  }
}

function displayParticipantInfo(data) {
  const container = document.getElementById("participantInfo");
  container.innerHTML = `
        <h3>👤 Participant Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">ID</div>
                <div class="info-value"><code>${data.id}</code></div>
            </div>
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${data.name || "N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${data.phone || "N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${data.address || "N/A"}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Last Update</div>
                <div class="info-value">${formatDateTime(data.lastUpdate)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total Locations</div>
                <div class="info-value">${
                  data.maps ? data.maps.length : 0
                }</div>
            </div>
        </div>
    `;
}

function initializeMap() {
  map = L.map("map").setView([-6.2088, 106.8456], 10); // Default to Jakarta

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function clearMapData() {
  // Remove existing markers
  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  // Remove existing polyline
  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
}

function addMarkersToMap(locations) {
  const latLngs = [];

  locations.forEach((location, index) => {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    const timestamp = location.timestamp;

    if (isNaN(lat) || isNaN(lng)) return;

    latLngs.push([lat, lng]);

    // Create marker
    const isFirst = index === 0;
    const isLast = index === locations.length - 1;

    let iconColor = "blue";
    let iconSymbol = "📍";

    if (isFirst) {
      iconColor = "green";
      iconSymbol = "🟢";
    } else if (isLast) {
      iconColor = "red";
      iconSymbol = "🔴";
    }

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`
            <div class="popup-title">${iconSymbol} Location ${index + 1}</div>
            <div class="popup-info">
                <strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(
      6
    )}<br>
                <strong>Time:</strong> ${formatDateTime(timestamp)}<br>
                <strong>Status:</strong> ${
                  isFirst
                    ? "First Location"
                    : isLast
                    ? "Latest Location"
                    : "Tracking Point"
                }
            </div>
        `);

    markers.push(marker);
  });

  // Create polyline to show path
  if (latLngs.length > 1) {
    polyline = L.polyline(latLngs, {
      color: "#3498db",
      weight: 3,
      opacity: 0.7,
    }).addTo(map);
  }

  // Fit map to show all markers
  if (latLngs.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

function displayLocationStats(locations) {
  if (!locations || locations.length === 0) return;

  const firstLocation = locations[0];
  const lastLocation = locations[locations.length - 1];
  const timeSpan =
    new Date(lastLocation.timestamp) - new Date(firstLocation.timestamp);
  const timeSpanHours = Math.round(timeSpan / (1000 * 60 * 60));

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const curr = locations[i];
    totalDistance += calculateDistance(
      parseFloat(prev.latitude),
      parseFloat(prev.longitude),
      parseFloat(curr.latitude),
      parseFloat(curr.longitude)
    );
  }

  const container = document.getElementById("locationStats");
  container.innerHTML = `
        <h3>📊 Location Statistics</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${locations.length}</div>
                <div class="stat-label">Total Points</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalDistance.toFixed(2)} km</div>
                <div class="stat-label">Total Distance</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${timeSpanHours}h</div>
                <div class="stat-label">Time Span</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatDateTime(
                  firstLocation.timestamp
                )}</div>
                <div class="stat-label">First Seen</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatDateTime(
                  lastLocation.timestamp
                )}</div>
                <div class="stat-label">Last Seen</div>
            </div>
        </div>
    `;
}

// Utility Functions
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Navigation Functions
function goBack() {
  switch (currentStep) {
    case "ids":
      showSection("logs");
      break;
    case "map":
      showSection("ids");
      break;
    default:
      showSection("logs");
  }
}

function refreshLogs() {
  loadLogs();
}

function centerMap() {
  if (map && markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log("Panel loaded");

  // Initialize DOM elements first
  if (!initializeDOMElements()) {
    console.error("Failed to initialize DOM elements");
    return;
  }

  showSection("logs");
  loadLogs();
});

// Handle browser back/forward buttons
window.addEventListener("popstate", (event) => {
  if (event.state) {
    showSection(event.state.section);
  }
});
