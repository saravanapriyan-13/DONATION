/**
 * ShareSphere - Explore Page: Search, Filters, Map View, & Smart Recommendations
 */

let currentExploreMap = null;
let mapMarkersGroup = null;
let mapRadiusCircle = null;

document.addEventListener('DOMContentLoaded', () => {
  initExploreParams();
  setupFilterListeners();
  renderExploreResources();
  renderSmartRecommendations();
});

/**
 * Read query string params (e.g. ?category=Books or ?q=laptop)
 */
function initExploreParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('category');
  const q = urlParams.get('q');

  if (cat) {
    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = cat;
  }
  if (q) {
    const searchInput = document.getElementById('explore-search-input');
    if (searchInput) searchInput.value = q;
  }
}

/**
 * Filter change listeners
 */
function setupFilterListeners() {
  const inputs = [
    'explore-search-input',
    'filter-category',
    'filter-distance',
    'filter-condition',
    'filter-availability',
    'filter-sort'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => renderExploreResources());
      el.addEventListener('change', () => renderExploreResources());
    }
  });

  // GPS Refresh button
  const gpsBtn = document.getElementById('btn-use-gps');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', async () => {
      gpsBtn.disabled = true;
      gpsBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Locating...';
      await window.ShareSphereLocation.requestCurrentPosition();
      gpsBtn.disabled = false;
      gpsBtn.innerHTML = '<i class="bi bi-crosshair text-primary"></i> GPS Updated';
      renderExploreResources();
    });
  }

  // Toggle Map / Grid View
  const viewToggleBtns = document.querySelectorAll('[data-view-toggle]');
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      viewToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.getAttribute('data-view-toggle');
      toggleExploreView(view);
    });
  });
}

function toggleExploreView(view) {
  const gridContainer = document.getElementById('explore-grid-view');
  const mapContainer = document.getElementById('explore-map-view');

  if (view === 'map') {
    gridContainer.style.display = 'none';
    mapContainer.style.display = 'block';
    setTimeout(() => initOrUpdateMap(), 150);
  } else {
    gridContainer.style.display = 'flex';
    mapContainer.style.display = 'none';
  }
}

/**
 * Execute Filter & Sorting Pipeline
 */
function getFilteredResources() {
  const searchVal = (document.getElementById('explore-search-input')?.value || '').toLowerCase().trim();
  const categoryVal = document.getElementById('filter-category')?.value || 'All';
  const distanceVal = document.getElementById('filter-distance')?.value || '10'; // default 10km radius
  const conditionVal = document.getElementById('filter-condition')?.value || 'All';
  const availabilityVal = document.getElementById('filter-availability')?.value || 'All';
  const sortVal = document.getElementById('filter-sort')?.value || 'nearest';

  const userLoc = window.ShareSphereLocation.getUserLocation();
  let donations = window.ShareSphereDB.getCollection('donations');

  // Calculate distance for all items
  donations = donations.map(item => ({
    ...item,
    calculatedDistanceKm: window.ShareSphereUtils.calculateDistanceKm(
      userLoc.lat,
      userLoc.lng,
      item.latitude,
      item.longitude
    )
  }));

  // Keyword search
  if (searchVal) {
    donations = donations.filter(d =>
      d.title.toLowerCase().includes(searchVal) ||
      d.description.toLowerCase().includes(searchVal) ||
      d.category.toLowerCase().includes(searchVal) ||
      (d.location && d.location.toLowerCase().includes(searchVal))
    );
  }

  // Category
  if (categoryVal !== 'All') {
    donations = donations.filter(d => d.category === categoryVal);
  }

  // Distance filter
  if (distanceVal !== 'all') {
    const maxKm = parseFloat(distanceVal);
    donations = donations.filter(d => d.calculatedDistanceKm <= maxKm);
  }

  // Condition
  if (conditionVal !== 'All') {
    donations = donations.filter(d => d.condition === conditionVal);
  }

  // Availability
  if (availabilityVal === 'Available') {
    donations = donations.filter(d => d.status === 'Available');
  }

  // Sorting
  if (sortVal === 'nearest') {
    donations.sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);
  } else if (sortVal === 'newest') {
    donations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortVal === 'rating') {
    donations.sort((a, b) => (b.donorRating || 0) - (a.donorRating || 0));
  }

  return donations;
}

/**
 * Render items in Grid View
 */
function renderExploreResources() {
  const container = document.getElementById('explore-resources-container');
  const countBadge = document.getElementById('explore-results-count');
  if (!container) return;

  const items = getFilteredResources();
  const userLoc = window.ShareSphereLocation.getUserLocation();

  if (countBadge) {
    countBadge.textContent = `${items.length} ${items.length === 1 ? 'Resource' : 'Resources'} Found`;
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box">
          <span class="empty-state-icon">🔍</span>
          <h4 class="empty-state-title">No resources matched your filters</h4>
          <p class="empty-state-text">Try expanding your search distance (e.g. up to 10 km) or selecting "All Categories".</p>
          <button class="btn btn-secondary-custom" onclick="resetExploreFilters()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset Filters
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => window.ShareSphereUtils.renderResourceCard(item, userLoc)).join('');

  // If map is currently active, update markers
  if (currentExploreMap && document.getElementById('explore-map-view').style.display !== 'none') {
    updateMapMarkers(items);
  }
}

function resetExploreFilters() {
  document.getElementById('explore-search-input').value = '';
  document.getElementById('filter-category').value = 'All';
  document.getElementById('filter-distance').value = '10';
  document.getElementById('filter-condition').value = 'All';
  document.getElementById('filter-availability').value = 'All';
  document.getElementById('filter-sort').value = 'nearest';
  renderExploreResources();
}

/**
 * Initialize Leaflet Map
 */
function initOrUpdateMap() {
  const userLoc = window.ShareSphereLocation.getUserLocation();
  const mapElement = document.getElementById('exploreMap');
  if (!mapElement || typeof L === 'undefined') return;

  if (!currentExploreMap) {
    currentExploreMap = L.map('exploreMap').setView([userLoc.lat, userLoc.lng], 13);

    // OpenStreetMap modern tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(currentExploreMap);

    mapMarkersGroup = L.layerGroup().addTo(currentExploreMap);
  } else {
    currentExploreMap.setView([userLoc.lat, userLoc.lng], 13);
  }

  // Draw 10km radius circle around user
  if (mapRadiusCircle) {
    currentExploreMap.removeLayer(mapRadiusCircle);
  }

  mapRadiusCircle = L.circle([userLoc.lat, userLoc.lng], {
    color: '#10B981',
    fillColor: '#10B981',
    fillOpacity: 0.12,
    radius: 10000 // 10 km in meters
  }).addTo(currentExploreMap);

  // User location marker
  const userMarkerIcon = L.divIcon({
    className: 'user-loc-div-icon',
    html: '<div class="user-location-marker"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  L.marker([userLoc.lat, userLoc.lng], { icon: userMarkerIcon })
    .addTo(currentExploreMap)
    .bindPopup('<b>📍 Your Community Location</b><br>10 km Resource Discovery Zone');

  const items = getFilteredResources();
  updateMapMarkers(items);
}

function updateMapMarkers(items) {
  if (!mapMarkersGroup || !currentExploreMap) return;
  mapMarkersGroup.clearLayers();

  items.forEach(item => {
    const meta = window.ShareSphereUtils.getCategoryMeta(item.category);
    const markerIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="custom-map-marker" title="${item.title}">${meta.icon}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const popupHtml = `
      <div style="max-width: 200px; font-family: system-ui, sans-serif;">
        <img src="${(item.imageUrls && item.imageUrls[0]) || ''}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;">
        <h6 style="font-weight: 700; margin: 0 0 4px; font-size: 0.85rem; line-height: 1.2;">${item.title}</h6>
        <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 6px;">
          📍 ${window.ShareSphereUtils.formatDistance(item.calculatedDistanceKm)}<br>
          <span class="badge bg-success" style="font-size: 0.65rem;">${item.condition}</span>
        </div>
        <a href="donation-details.html?id=${item.id}" class="btn btn-sm btn-primary w-100" style="font-size: 0.72rem; padding: 0.25rem 0.5rem;">
          View Resource
        </a>
      </div>
    `;

    L.marker([item.latitude, item.longitude], { icon: markerIcon })
      .addTo(mapMarkersGroup)
      .bindPopup(popupHtml);
  });
}

/**
 * Smart Recommendations
 */
function renderSmartRecommendations() {
  const container = document.getElementById('smart-recommendations-container');
  if (!container) return;

  const userLoc = window.ShareSphereLocation.getUserLocation();
  const all = window.ShareSphereDB.getCollection('donations').filter(d => d.status === 'Available');

  // Simple explainable rule: Select top available resources within 5 km
  const recommended = all
    .map(d => ({
      ...d,
      dist: window.ShareSphereUtils.calculateDistanceKm(userLoc.lat, userLoc.lng, d.latitude, d.longitude)
    }))
    .filter(d => d.dist <= 5.0)
    .slice(0, 3);

  if (recommended.length === 0) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = recommended.map(item => window.ShareSphereUtils.renderResourceCard(item, userLoc)).join('');
}
