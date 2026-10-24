/**
 * ShareSphere - Home Page Logic & Interactive Animations
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCounters();
  renderHomeCategories();
  renderHomeNearbyDonations();
});

/**
 * Animated Counter when entering viewport
 */
function initHeroCounters() {
  const statsElements = document.querySelectorAll('.counter-val');
  if (!statsElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target')) || 0;
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            el.textContent = target.toLocaleString() + '+';
            clearInterval(timer);
          } else {
            el.textContent = Math.floor(current).toLocaleString();
          }
        }, stepTime);

        obs.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  statsElements.forEach(el => observer.observe(el));
}

/**
 * Render Categories with dynamic item counts
 */
function renderHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  const donations = window.ShareSphereDB.getCollection('donations');
  const categories = [
    { name: 'Food', icon: '🍎', class: 'cat-food' },
    { name: 'Clothes', icon: '👕', class: 'cat-clothes' },
    { name: 'Books', icon: '📚', class: 'cat-books' },
    { name: 'Electronics', icon: '💻', class: 'cat-electronics' },
    { name: 'Furniture', icon: '🪑', class: 'cat-furniture' },
    { name: 'Toys', icon: '🧸', class: 'cat-toys' },
    { name: 'Other', icon: '📦', class: 'cat-other' }
  ];

  container.innerHTML = categories.map(cat => {
    const count = donations.filter(d => d.category === cat.name && d.status === 'Available').length;
    return `
      <div class="col-lg-3 col-md-4 col-6 mb-4">
        <a href="explore.html?category=${encodeURIComponent(cat.name)}" class="text-decoration-none">
          <div class="category-card ${cat.class}">
            <div class="category-icon-box">
              <span>${cat.icon}</span>
            </div>
            <h5 class="category-name">${cat.name}</h5>
            <span class="category-count">${count} available</span>
          </div>
        </a>
      </div>
    `;
  }).join('');
}

/**
 * Render Nearby Resources (10 km limit)
 */
function renderHomeNearbyDonations() {
  const container = document.getElementById('home-nearby-grid');
  if (!container) return;

  const allDonations = window.ShareSphereDB.getCollection('donations').filter(d => d.status === 'Available');
  const userLoc = window.ShareSphereLocation.getUserLocation();

  // Match resources within 10 km
  const nearby = window.ShareSphereLocation.filterWithinRadius(allDonations, 10, userLoc).slice(0, 6);

  if (nearby.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box">
          <span class="empty-state-icon">📦</span>
          <h4 class="empty-state-title">No resources nearby yet</h4>
          <p class="empty-state-text">Be the first to share an unused resource in your neighborhood!</p>
          <a href="donate.html" class="btn btn-primary-custom">
            <i class="bi bi-plus-circle"></i> Donate an Item
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = nearby.map(item => window.ShareSphereUtils.renderResourceCard(item, userLoc)).join('');
}
