/**
 * ShareSphere - Core Utilities & Helper Functions
 */

// Global Utility Namespace
window.ShareSphereUtils = {
  /**
   * Calculate distance between two coordinate pairs using Haversine Formula
   * @returns {number} Distance in kilometers
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const pLat1 = parseFloat(lat1);
    const pLon1 = parseFloat(lon1);
    const pLat2 = parseFloat(lat2);
    const pLon2 = parseFloat(lon2);

    if (!Number.isFinite(pLat1) || !Number.isFinite(pLon1) || !Number.isFinite(pLat2) || !Number.isFinite(pLon2)) {
      return 2.5; // Safe realistic neighborhood distance fallback
    }

    const R = 6371; // Earth's radius in km
    const dLat = (pLat2 - pLat1) * (Math.PI / 180);
    const dLon = (pLon2 - pLon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pLat1 * (Math.PI / 180)) *
      Math.cos(pLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = parseFloat((R * c).toFixed(1));
    return Number.isFinite(dist) ? dist : 2.5;
  },

  /**
   * Format distance with badge friendly string
   */
  formatDistance(km) {
    if (km < 1) {
      return `${Math.round(km * 1000)} m away`;
    }
    return `${km.toFixed(1)} km away`;
  },

  /**
   * Toast Notification Controller
   */
  showToast(message, type = 'info', icon = null) {
    let container = document.getElementById('sharesphere-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sharesphere-toast-container';
      container.className = 'toast-container-custom';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let defaultIcon = 'bi-info-circle-fill text-primary';
    if (type === 'success') defaultIcon = 'bi-check-circle-fill text-success';
    if (type === 'error') defaultIcon = 'bi-exclamation-triangle-fill text-danger';
    if (type === 'warning') defaultIcon = 'bi-exclamation-circle-fill text-warning';

    toast.innerHTML = `
      <i class="toast-icon bi ${icon || defaultIcon}"></i>
      <p class="toast-message">${message}</p>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  },

  /**
   * Category color and icon map
   */
  getCategoryMeta(category) {
    const map = {
      'Food': { icon: '🍎', class: 'cat-food', color: '#F59E0B', weightKg: 1.5, co2Kg: 2.2 },
      'Clothes': { icon: '👕', class: 'cat-clothes', color: '#4F46E5', weightKg: 0.8, co2Kg: 3.5 },
      'Books': { icon: '📚', class: 'cat-books', color: '#8B5CF6', weightKg: 1.2, co2Kg: 1.8 },
      'Electronics': { icon: '💻', class: 'cat-electronics', color: '#2563EB', weightKg: 2.5, co2Kg: 8.5 },
      'Furniture': { icon: '🪑', class: 'cat-furniture', color: '#F97316', weightKg: 12.0, co2Kg: 15.0 },
      'Toys': { icon: '🧸', class: 'cat-toys', color: '#EC4899', weightKg: 0.6, co2Kg: 1.2 },
      'Other': { icon: '📦', class: 'cat-other', color: '#10B981', weightKg: 1.0, co2Kg: 2.0 }
    };
    return map[category] || map['Other'];
  },

  /**
   * Environmental Impact Estimates
   */
  calculateEnvironmentalImpact(donations) {
    let itemsReused = 0;
    let estimatedWasteKg = 0;
    let estimatedCO2eKg = 0;

    donations.forEach(item => {
      const count = parseInt(item.quantity) || 1;
      const meta = this.getCategoryMeta(item.category);
      itemsReused += count;
      estimatedWasteKg += count * meta.weightKg;
      estimatedCO2eKg += count * meta.co2Kg;
    });

    return {
      itemsReused,
      estimatedWasteKg: parseFloat(estimatedWasteKg.toFixed(1)),
      estimatedCO2eKg: parseFloat(estimatedCO2eKg.toFixed(1)),
      peopleHelped: Math.round(itemsReused * 1.6)
    };
  },

  /**
   * Synchronized Platform Environmental Impact Metrics
   * Harmonizes homepage index.html stats and impact.html dashboard
   */
  getPlatformImpactMetrics(donations = []) {
    const BASE_ITEMS_REUSED = 3200;
    const BASE_PEOPLE_HELPED = 5800;
    const BASE_WASTE_KG = 4850.0;
    const BASE_CO2_KG = 7240.0;

    let dynamicItems = 0;
    let dynamicWaste = 0;
    let dynamicCO2 = 0;

    (donations || []).forEach(item => {
      const count = parseInt(item.quantity) || 1;
      const meta = this.getCategoryMeta(item.category);
      dynamicItems += count;
      dynamicWaste += count * (meta.weightKg || 1.0);
      dynamicCO2 += count * (meta.co2Kg || 2.0);
    });

    return {
      itemsReused: BASE_ITEMS_REUSED + dynamicItems,
      estimatedWasteKg: parseFloat((BASE_WASTE_KG + dynamicWaste).toFixed(1)),
      estimatedCO2eKg: parseFloat((BASE_CO2_KG + dynamicCO2).toFixed(1)),
      peopleHelped: BASE_PEOPLE_HELPED + Math.round(dynamicItems * 1.6)
    };
  },

  /**
   * Wishlist Helper
   */
  getWishlist() {
    const user = window.ShareSphereAuth ? window.ShareSphereAuth.getCurrentUser() : null;
    const key = 'sharesphere_wishlist_' + (user ? user.id : 'guest');
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  },

  toggleWishlist(donationId) {
    const user = window.ShareSphereAuth ? window.ShareSphereAuth.getCurrentUser() : null;
    const key = 'sharesphere_wishlist_' + (user ? user.id : 'guest');
    let list = this.getWishlist();
    const index = list.indexOf(donationId);
    let added = false;

    if (index === -1) {
      list.push(donationId);
      added = true;
      this.showToast('❤️ Added to your saved resources', 'success');
    } else {
      list.splice(index, 1);
      this.showToast('Removed from saved resources', 'info');
    }

    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      console.warn('LocalStorage error saving wishlist:', err);
    }
    this.updateNavbarCounters();
    window.dispatchEvent(new CustomEvent('sharesphere_wishlist_updated', { detail: { donationId, added } }));
    return added;
  },

  handleCardWishlistClick(event, btn, itemId) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    const added = this.toggleWishlist(itemId);
    if (btn) {
      const icon = btn.querySelector('i');
      if (added) {
        btn.classList.add('active');
        if (icon) icon.className = 'bi bi-heart-fill';
      } else {
        btn.classList.remove('active');
        if (icon) icon.className = 'bi bi-heart';
      }
    }
    return added;
  },

  isInWishlist(donationId) {
    return this.getWishlist().includes(donationId);
  },

  /**
   * Relative Time Formatter
   */
  timeAgo(isoDate) {
    if (!isoDate) return 'Just now';
    const date = new Date(isoDate);
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Update all header and badge counters
   */
  updateNavbarCounters() {
    const wishlistCount = this.getWishlist().length;
    const wishlistBadges = document.querySelectorAll('#nav-wishlist-count, .nav-wishlist-count-badge');
    wishlistBadges.forEach(badge => {
      badge.textContent = wishlistCount;
      badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
    });

    const user = window.ShareSphereAuth ? window.ShareSphereAuth.getCurrentUser() : null;
    if (user && window.ShareSphereDB) {
      const notifs = window.ShareSphereDB.getCollection('notifications').filter(n => n.userId === user.id && !n.isRead);
      const notifBadges = document.querySelectorAll('#nav-notif-count, .nav-notif-count-badge');
      notifBadges.forEach(badge => {
        badge.textContent = notifs.length;
        badge.style.display = notifs.length > 0 ? 'flex' : 'none';
      });
    }
  },

  /**
   * Generate Resource Card HTML
   */
  renderResourceCard(item, userLocation) {
    const meta = this.getCategoryMeta(item.category);
    const dist = userLocation
      ? this.calculateDistanceKm(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
      : 2.4;
    const isSaved = this.isInWishlist(item.id);
    const imgUrl = (item.imageUrls && item.imageUrls[0]) || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="resource-card shadow-sm">
          <div class="card-img-wrap">
            <span class="category-badge-chip">
              <span>${meta.icon}</span>
              <span>${item.category}</span>
            </span>
            <button class="wishlist-btn-corner ${isSaved ? 'active' : ''}" 
                    title="Save to Wishlist" 
                    onclick="window.ShareSphereUtils.handleCardWishlistClick(event, this, '${item.id}')">
              <i class="bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}"></i>
            </button>
            <img src="${imgUrl}" alt="${item.title}" loading="lazy">
            <div class="distance-badge-overlay">
              <i class="bi bi-geo-alt-fill text-emerald"></i> ${this.formatDistance(dist)}
            </div>
            <div class="status-badge-overlay ${item.status.toLowerCase()}">
              ${item.status}
            </div>
          </div>
          <div class="card-body-custom">
            <h5 class="card-title-custom" title="${item.title}">${item.title}</h5>
            <p class="card-desc-custom">${item.description}</p>
            <div class="card-meta-chips">
              <span class="meta-chip condition">
                <i class="bi bi-shield-check"></i> ${item.condition}
              </span>
              <span class="meta-chip">
                <i class="bi bi-box-seam"></i> Qty: ${item.quantity}
              </span>
              ${item.expiryDate ? `<span class="meta-chip expiry"><i class="bi bi-hourglass-split"></i> Exp: ${item.expiryDate}</span>` : ''}
            </div>
            <div class="donor-info-row">
              <div class="donor-profile-sm">
                <img src="${item.donorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="donor-avatar-sm" alt="Donor">
                <div>
                  <div class="donor-name-sm">${item.donorName || 'Community Donor'}</div>
                  <div class="donor-rating-sm">
                    <i class="bi bi-star-fill"></i> ${item.donorRating || '4.9'}
                  </div>
                </div>
              </div>
              <a href="donation-details.html?id=${item.id}" class="btn btn-sm btn-primary-custom" style="padding: 0.4rem 0.95rem; font-size: 0.82rem;">
                View Details <i class="bi bi-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

// Global scroll effect for navbar
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.sharesphere-navbar');
  if (navbar) {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});
