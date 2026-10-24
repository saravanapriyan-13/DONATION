/**
 * ShareSphere - Authentication & Session Management
 */

window.ShareSphereAuth = {
  CURRENT_USER_KEY: 'sharesphere_active_user',

  /**
   * Get active logged in user
   */
  getCurrentUser() {
    const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;
    if (!auth || !auth.currentUser) return null;

    const raw = localStorage.getItem(this.CURRENT_USER_KEY);
    if (raw) {
      try {
        const user = JSON.parse(raw);
        return user.id === auth.currentUser.uid ? user : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('sharesphere_auth_changed', { detail: { user } }));
  },

  /**
   * Log in user
   */
  async login(email, password) {
    const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;
    if (!auth) return { success: false, error: 'Firebase Authentication is not configured.' };

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const fbUser = userCredential.user;
      const token = await fbUser.getIdTokenResult();
      const appUser = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0],
        email: fbUser.email,
        role: token.claims.admin === true || token.claims.role === 'admin' ? 'admin' : 'user',
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        location: 'Bangalore, India',
        points: 0,
        rating: 5.0
      };
      this.setCurrentUser(appUser);
      return { success: true, user: appUser };
    } catch (e) {
      console.warn('Firebase login failed:', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Register new user
   */
  async register(name, email, password, location) {
    const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;
    if (!auth) return { success: false, error: 'Firebase Authentication is not configured.' };

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      const newUser = {
        id: userCredential.user.uid,
        name,
        email: userCredential.user.email,
        role: 'user',
        status: 'Active',
        avatar: userCredential.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        location: location || 'Bangalore, India',
        points: 0,
        rating: 5.0,
        donationsCount: 0,
        requestsCount: 0,
        completedCount: 0,
        peopleHelped: 0,
        badges: ['Eco Starter'],
        createdAt: new Date().toISOString()
      };

      await window.ShareSphereDB.insert('users', newUser);
      this.setCurrentUser(newUser);
      return { success: true, user: newUser };
    } catch (e) {
      console.warn('Firebase registration failed:', e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Logout
   */
  async logout() {
    const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;
    if (auth) {
      try {
        await auth.signOut();
      } catch (e) {
        console.warn('Firebase logout failed:', e.message);
      }
    }
    this.setCurrentUser(null);
    window.ShareSphereUtils.showToast('You have been logged out.', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  },

  /**
   * Require login protection
   */
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return user;
  },

  /**
   * Render navigation bar auth state
   */
  renderNavAuth() {
    const user = this.getCurrentUser();
    const container = document.getElementById('navbar-auth-section');
    if (!container) return;

    if (user) {
      container.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <!-- Notification Bell -->
          <a href="notifications.html" class="nav-icon-btn text-decoration-none" title="Notifications">
            <i class="bi bi-bell"></i>
            <span class="badge-counter" id="nav-notif-count" style="display: none;">0</span>
          </a>

          <!-- Saved / Wishlist -->
          <a href="wishlist.html" class="nav-icon-btn text-decoration-none" title="Saved Resources">
            <i class="bi bi-heart"></i>
            <span class="badge-counter" id="nav-wishlist-count" style="display: none;">0</span>
          </a>

          <!-- User Menu Dropdown -->
          <div class="dropdown">
            <button class="btn p-0 border-0 d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="${user.avatar}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
            </button>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-custom">
              <li class="px-3 py-2 border-bottom mb-2">
                <div class="fw-bold text-dark">${user.name}</div>
                <div class="small text-muted text-truncate">${user.email}</div>
                <div class="badge bg-success-subtle text-success mt-1">🌱 ${user.points || 500} Impact Points</div>
              </li>
              <li><a class="dropdown-item dropdown-item-custom" href="profile.html"><i class="bi bi-person-circle text-primary"></i> My Profile</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="donations.html"><i class="bi bi-box2-heart text-success"></i> My Donations</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="requests.html"><i class="bi bi-arrow-left-right text-info"></i> My Requests</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="wishlist.html"><i class="bi bi-heart text-danger"></i> Saved Resources</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="impact.html"><i class="bi bi-globe-americas text-emerald"></i> Environmental Impact</a></li>
              ${user.role === 'admin' ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item dropdown-item-custom text-primary fw-bold" href="admin.html"><i class="bi bi-shield-lock-fill"></i> Admin Console</a></li>` : ''}
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item dropdown-item-custom text-danger" href="javascript:void(0)" onclick="window.ShareSphereAuth.logout()"><i class="bi bi-box-arrow-right"></i> Sign Out</a></li>
            </ul>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <a href="login.html" class="btn btn-secondary-custom">Log In</a>
          <a href="register.html" class="btn btn-primary-custom">Join Community</a>
        </div>
      `;
    }

    if (window.ShareSphereUtils) {
      window.ShareSphereUtils.updateNavbarCounters();
    }
  }
};

// Auto render on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.ShareSphereAuth.renderNavAuth();
});
