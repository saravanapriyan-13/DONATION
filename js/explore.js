/**
 * ShareSphere - Explore Page: Amazon/Flipkart Style with Fixed Filtering
 * ALL donations from ALL users are visible (no distance restriction by default)
 */

let currentExploreMap = null;
let mapMarkersGroup = null;
let mapRadiusCircle = null;
let activeCategory = 'All';
let mapVisible = false;

document.addEventListener('DOMContentLoaded', () => {
  initExploreParams();
  setupCategoryPills();
  setupQuickFilters();
  setupFilterListeners();
  setupMapToggle();
  renderExploreResources();
  renderTrending();

  // Listen for live updates from server or another user/tab
  window.addEventListener('sharesphere_data_changed', (e) => {
    if (!e.detail || e.detail.collection === 'donations') {
      renderExploreResources();
      renderTrending();
    }
  });

  // Pull fresh data immediately on page load
  if (window.ShareSphereDB && typeof window.ShareSphereDB.syncAllFromAPI === 'function') {
    window.ShareSphereDB.syncAllFromAPI().then(() => {
      renderExploreResources();
      renderTrending();
    });
  }

  // Periodic live check for donations uploaded from other phones/devices
  setInterval(() => {
    if (window.ShareSphereDB && typeof window.ShareSphereDB.syncCollectionFromAPI === 'function') {
      window.ShareSphereDB.syncCollectionFromAPI('donations').then(() => {
        renderExploreResources();
        renderTrending();
      });
    }
  }, 3000);
});

/**
 * Read query string params
 */
function initExploreParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('category');
  const q = urlParams.get('q');
  if (cat) { activeCategory = cat; highlightPill(cat); }
  if (q) { const el = document.getElementById('explore-search-input'); if (el) el.value = q; }
}

/**
 * Category pill click handlers
 */
function setupCategoryPills() {
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeCategory = pill.getAttribute('data-cat') || 'All';
      highlightPill(activeCategory);
      renderExploreResources();
    });
  });
}

function highlightPill(cat) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  const target = document.querySelector('.cat-pill[data-cat="' + cat + '"]');
  if (target) target.classList.add('active');
}

/**
 * Quick filter chips inside banner
 */
function setupQuickFilters() {
  document.querySelectorAll('[data-qf]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-qf]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const qf = chip.getAttribute('data-qf');
      const sortEl = document.getElementById('filter-sort');
      if (qf === 'newest') { if (sortEl) sortEl.value = 'newest'; activeCategory = 'All'; highlightPill('All'); }
      else if (qf === 'all') { activeCategory = 'All'; highlightPill('All'); }
      else { activeCategory = qf; highlightPill(qf); }
      renderExploreResources();
    });
  });
}

/**
 * Filter change listeners
 */
function setupFilterListeners() {
  ['explore-search-input','filter-condition','filter-availability','filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => renderExploreResources());
      el.addEventListener('change', () => renderExploreResources());
    }
  });
  const searchBtn = document.getElementById('btn-search-go');
  if (searchBtn) searchBtn.addEventListener('click', () => renderExploreResources());
}

/**
 * Map toggle
 */
function setupMapToggle() {
  const btn = document.getElementById('btn-map-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    mapVisible = !mapVisible;
    const grid = document.getElementById('explore-grid-view');
    const mapDiv = document.getElementById('explore-map-view');
    if (mapVisible) {
      grid.style.display = 'none';
      mapDiv.style.display = 'block';
      btn.innerHTML = '<i class="bi bi-grid-3x3-gap-fill"></i> Grid View';
      setTimeout(() => initOrUpdateMap(), 150);
    } else {
      grid.style.display = 'block';
      mapDiv.style.display = 'none';
      btn.innerHTML = '<i class="bi bi-map-fill"></i> Map View';
    }
  });
}

/**
 * Core filter pipeline — NO distance restriction by default (shows all)
 */
function getFilteredResources() {
  const searchVal = (document.getElementById('explore-search-input')?.value || '').toLowerCase().trim();
  const conditionVal = document.getElementById('filter-condition')?.value || 'All';
  const availabilityVal = document.getElementById('filter-availability')?.value || 'Available';
  const sortVal = document.getElementById('filter-sort')?.value || 'newest';
  const userLoc = window.ShareSphereLocation.getUserLocation();

  let donations = window.ShareSphereDB.getCollection('donations').filter(d => d && d.id && !d.id.startsWith('don_seed_'));

  // Attach distance for display (does NOT filter on it unless user sets GPS sort)
  donations = donations.map(item => ({
    ...item,
    calculatedDistanceKm: window.ShareSphereUtils.calculateDistanceKm(
      userLoc.lat, userLoc.lng, item.latitude, item.longitude
    )
  }));

  // Keyword search
  if (searchVal) {
    donations = donations.filter(d =>
      (d.title || '').toLowerCase().includes(searchVal) ||
      (d.description || '').toLowerCase().includes(searchVal) ||
      (d.category || '').toLowerCase().includes(searchVal) ||
      (d.location || '').toLowerCase().includes(searchVal) ||
      (d.donorName || '').toLowerCase().includes(searchVal)
    );
  }

  // Category
  if (activeCategory && activeCategory !== 'All') {
    donations = donations.filter(d => d.category === activeCategory);
  }

  // Condition
  if (conditionVal !== 'All') {
    donations = donations.filter(d => d.condition === conditionVal);
  }

  // Availability (case-insensitive check for 'AVAILABLE')
  if (availabilityVal === 'Available') {
    donations = donations.filter(d => !d.status || (d.status || '').toUpperCase() === 'AVAILABLE');
  }

  // Sorting
  if (sortVal === 'nearest') {
    donations.sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);
  } else if (sortVal === 'newest') {
    donations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortVal === 'popular') {
    donations.sort((a, b) => (b.requestsCount || 0) - (a.requestsCount || 0));
  } else if (sortVal === 'rating') {
    donations.sort((a, b) => (b.donorRating || 0) - (a.donorRating || 0));
  }

  return donations;
}

/**
 * Render product cards in Flipkart/Amazon grid style
 */
function renderExploreResources() {
  const container = document.getElementById('explore-resources-container');
  const countBadge = document.getElementById('explore-results-count');
  if (!container) return;

  const items = getFilteredResources();
  const userLoc = window.ShareSphereLocation.getUserLocation();

  if (countBadge) {
    countBadge.textContent = items.length + ' ' + (items.length === 1 ? 'item' : 'items') + ' found';
  }

  if (items.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;"><div class="explore-empty p-5 rounded-4 border border-secondary border-opacity-25" style="background: rgba(18, 22, 36, 0.85);"><span class="explore-empty-icon" style="font-size:3.5rem;">📦</span><h4 class="fw-bold text-white mb-2">No donations match your filter</h4><p class="text-zinc-300 mb-4">Be the first to donate an item or try clearing your filters.</p><a href="donate.html" class="btn btn-primary-custom px-4 py-2 me-2"><i class="bi bi-plus-circle me-1"></i> Donate an Item</a><button class="btn btn-outline-light px-3 py-2" onclick="resetExploreFilters()">Reset Filters</button></div></div>';
    return;
  }

  container.innerHTML = items.map(item => renderProductCard(item, userLoc)).join('');

  if (mapVisible && currentExploreMap) {
    updateMapMarkers(items);
  }
}

window.toggleCardWishlist = function(event, btn, itemId) {
  if (window.ShareSphereUtils && typeof window.ShareSphereUtils.handleCardWishlistClick === 'function') {
    return window.ShareSphereUtils.handleCardWishlistClick(event, btn, itemId);
  }
  if (event) event.stopPropagation();
  window.ShareSphereUtils.toggleWishlist(itemId);
  const active = btn.classList.toggle('active');
  btn.innerHTML = '<i class="bi ' + (active ? 'bi-heart-fill' : 'bi-heart') + '"></i>';
};

/**
 * Flipkart/Amazon style product card
 */
function renderProductCard(item, userLoc) {
  const meta = window.ShareSphereUtils.getCategoryMeta(item.category);
  const dist = userLoc
    ? window.ShareSphereUtils.calculateDistanceKm(userLoc.lat, userLoc.lng, item.latitude, item.longitude)
    : null;
  const isSaved = window.ShareSphereUtils.isInWishlist(item.id);
  const imgUrl = (item.imageUrls && item.imageUrls[0]) || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80';
  const stars = '★'.repeat(Math.round(item.donorRating || 5)) + '☆'.repeat(5 - Math.round(item.donorRating || 5));
  const distStr = dist !== null ? window.ShareSphereUtils.formatDistance(dist) : '';
  const statusClass = (item.status || '').toLowerCase();
  const timeAgo = window.ShareSphereUtils.timeAgo(item.createdAt);

  const currentUser = window.ShareSphereAuth ? window.ShareSphereAuth.getCurrentUser() : null;
  const isMyListing = currentUser && item.donorId && (currentUser.id === item.donorId || (currentUser.uid && currentUser.uid === item.donorId));

  return '<div class="product-card">' +
    '<div class="product-card-img-wrap">' +
      '<img src="' + imgUrl + '" alt="' + (item.title || '') + '" loading="lazy" onclick="window.location.href=\'donation-details.html?id=' + item.id + '\'">' +
      '<span class="product-card-badge-free">FREE</span>' +
      '<span class="product-card-cat-icon">' + meta.icon + '</span>' +
      '<button class="product-wishlist-btn ' + (isSaved ? 'active' : '') + '" title="Save" onclick="window.toggleCardWishlist(event, this, \'' + item.id + '\')">' +
        '<i class="bi ' + (isSaved ? 'bi-heart-fill' : 'bi-heart') + '"></i>' +
      '</button>' +
    '</div>' +
    '<div class="product-card-body">' +
      '<div class="product-card-title text-white font-bold" onclick="window.location.href=\'donation-details.html?id=' + item.id + '\'">' + (item.title || 'Item') + '</div>' +
      '<div class="product-card-meta d-flex align-items-center gap-2 flex-wrap">' +
        '<span class="cond-badge">' + (item.condition || '') + '</span>' +
        '<span class="status-chip ' + statusClass + '">' + (item.status || '') + '</span>' +
        (isMyListing ? '<span class="badge bg-secondary-subtle text-light border border-secondary" style="font-size:0.68rem;">Your Item</span>' : '') +
        (item.quantity > 1 ? '<span style="font-size:0.75rem;color:#E2E8F0;font-weight:600;">Qty: ' + item.quantity + '</span>' : '') +
      '</div>' +
      '<div class="product-card-location mb-2 text-zinc-300">' +
        '<i class="bi bi-geo-alt-fill text-emerald-400"></i> ' + (item.location || 'Community Area') +
        (distStr ? ' &bull; <span style="color:#10B981;font-weight:700;">' + distStr + '</span>' : '') +
        '<span style="color:#CBD5E1;margin-left:6px;font-size:0.72rem;font-weight:500;">' + timeAgo + '</span>' +
      '</div>' +
      '<div class="product-card-donor">' +
        '<img src="' + (item.donorAvatar || 'https://i.pravatar.cc/150?img=1') + '" alt="' + (item.donorName || '') + '" onerror="this.src=\'https://i.pravatar.cc/150?img=1\'">' +
        '<div>' +
          '<div class="product-card-donor-name text-white font-medium">' + (item.donorName || 'Community Donor') + (isMyListing ? ' (You)' : '') + '</div>' +
          '<div class="product-card-rating" style="color:#FBBF24;font-size:0.72rem;font-weight:600;">' + stars + ' ' + (item.donorRating || '5.0') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    (isMyListing 
      ? '<a href="donations.html" class="product-card-btn" style="background:#334155;color:#F8FAFC;letter-spacing:0.3px;font-weight:600;"><i class="bi bi-box2-heart"></i> YOUR LISTING &bull; MANAGE</a>'
      : '<a href="donation-details.html?id=' + item.id + '" class="product-card-btn primary-btn">VIEW &amp; REQUEST &rarr;</a>') +
  '</div>';
}

function resetExploreFilters() {
  const si = document.getElementById('explore-search-input');
  if (si) si.value = '';
  const fc = document.getElementById('filter-condition');
  if (fc) fc.value = 'All';
  const fa = document.getElementById('filter-availability');
  if (fa) fa.value = 'Available';
  const fs = document.getElementById('filter-sort');
  if (fs) fs.value = 'newest';
  activeCategory = 'All';
  highlightPill('All');
  renderExploreResources();
}

/**
 * Trending / Popular items (top 6 by requestsCount)
 */
function renderTrending() {
  const container = document.getElementById('trending-container');
  const section = document.getElementById('trending-section');
  if (!container) return;

  const userLoc = window.ShareSphereLocation.getUserLocation();
  const all = window.ShareSphereDB.getCollection('donations')
    .filter(d => d.status === 'Available')
    .sort((a, b) => (b.requestsCount || 0) - (a.requestsCount || 0))
    .slice(0, 6);

  if (all.length === 0) { if (section) section.style.display = 'none'; return; }
  container.innerHTML = all.map(item => renderProductCard(item, userLoc)).join('');
}

/**
 * Leaflet Map
 */
function initOrUpdateMap() {
  const userLoc = window.ShareSphereLocation.getUserLocation();
  const mapElement = document.getElementById('exploreMap');
  if (!mapElement || typeof L === 'undefined') return;

  if (!currentExploreMap) {
    currentExploreMap = L.map('exploreMap').setView([userLoc.lat, userLoc.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(currentExploreMap);
    mapMarkersGroup = L.layerGroup().addTo(currentExploreMap);
  } else {
    currentExploreMap.setView([userLoc.lat, userLoc.lng], 12);
  }

  if (mapRadiusCircle) currentExploreMap.removeLayer(mapRadiusCircle);
  mapRadiusCircle = L.circle([userLoc.lat, userLoc.lng], {
    color: '#10B981', fillColor: '#10B981', fillOpacity: 0.08, radius: 10000
  }).addTo(currentExploreMap);

  const userIcon = L.divIcon({
    className: 'user-loc-div-icon',
    html: '<div class="user-location-marker"></div>',
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
  L.marker([userLoc.lat, userLoc.lng], { icon: userIcon })
    .addTo(currentExploreMap)
    .bindPopup('<b>📍 Your Location</b>');

  const items = getFilteredResources();
  updateMapMarkers(items);
}

function updateMapMarkers(items) {
  if (!mapMarkersGroup || !currentExploreMap) return;
  mapMarkersGroup.clearLayers();
  items.forEach(item => {
    if (!item.latitude || !item.longitude) return;
    const meta = window.ShareSphereUtils.getCategoryMeta(item.category);
    const icon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: '<div class="custom-map-marker" title="' + item.title + '">' + meta.icon + '</div>',
      iconSize: [38, 38], iconAnchor: [19, 19]
    });
    const img = (item.imageUrls && item.imageUrls[0]) || '';
    L.marker([item.latitude, item.longitude], { icon })
      .addTo(mapMarkersGroup)
      .bindPopup('<div style="max-width:180px;font-family:system-ui"><img src="' + img + '" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"><h6 style="font-weight:700;margin:0 0 4px;font-size:0.82rem">' + item.title + '</h6><div style="font-size:0.72rem;color:#666;margin-bottom:6px">' + (item.location || '') + '</div><a href="donation-details.html?id=' + item.id + '" style="display:block;background:#10B981;color:#fff;text-align:center;border-radius:4px;padding:4px 0;font-size:0.75rem;text-decoration:none;font-weight:700">View Details</a></div>');
  });
}
