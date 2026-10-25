/**
 * ShareSphere - Saved Resources / Wishlist Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  renderWishlistItems();
  window.addEventListener('sharesphere_wishlist_updated', renderWishlistItems);
  window.addEventListener('sharesphere_data_changed', (e) => {
    if (!e.detail || e.detail.collection === 'donations') {
      renderWishlistItems();
    }
  });

  // Pull fresh data if available
  if (window.ShareSphereDB && typeof window.ShareSphereDB.syncAllFromAPI === 'function') {
    window.ShareSphereDB.syncAllFromAPI().then(() => {
      renderWishlistItems();
    });
  }
});

function renderWishlistItems() {
  const container = document.getElementById('wishlist-grid');
  const countBadge = document.getElementById('wishlist-total-count');
  if (!container) return;

  const savedIds = window.ShareSphereUtils.getWishlist();
  const allDonations = window.ShareSphereDB.getCollection('donations');
  const items = allDonations.filter(d => savedIds.includes(d.id));
  const userLoc = window.ShareSphereLocation.getUserLocation();

  if (countBadge) {
    countBadge.textContent = `${items.length} ${items.length === 1 ? 'Resource' : 'Resources'}`;
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box">
          <span class="empty-state-icon">❤️</span>
          <h4 class="empty-state-title">Your saved list is empty</h4>
          <p class="empty-state-text">Bookmark resources you find interesting while exploring the community.</p>
          <a href="explore.html" class="btn btn-primary-custom">
            <i class="bi bi-compass"></i> Explore Resources
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => window.ShareSphereUtils.renderResourceCard(item, userLoc)).join('');
}
