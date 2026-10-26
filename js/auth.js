/**
 * ShareSphere - Authentication & Session Management
 */

window.ShareSphereAuth = {
  CURRENT_USER_KEY: 'sharesphere_active_user',

  /**
   * Get active logged in user
   */
  getCurrentUser() {
    const raw = localStorage.getItem(this.CURRENT_USER_KEY);
    if (!raw) return null;

    try {
      const user = JSON.parse(raw);
      if (!user) return null;
      if (!user.uid) user.uid = user.id;
      if (!user.id) user.id = user.uid;

      const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;
      if (auth && auth.currentUser) {
        return (user.id === auth.currentUser.uid || user.uid === auth.currentUser.uid) ? user : null;
      }
      // Return cached local session when Firebase is not configured or in local mode
      return user;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (user) {
      if (!user.uid) user.uid = user.id;
      if (!user.id) user.id = user.uid;
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

    // 1. Authenticate via Firebase if active
    if (auth) {
      try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const fbUser = userCredential.user;
        let claims = {};
        try {
          const token = await fbUser.getIdTokenResult();
          claims = token.claims || {};
        } catch (_) {}

        const users = window.ShareSphereDB ? window.ShareSphereDB.getCollection('users') : [];
        let appUser = users.find(u => u.id === fbUser.uid || (u.email && u.email.toLowerCase() === email.toLowerCase()));

        if (!appUser) {
          appUser = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0],
            email: fbUser.email,
            role: claims.admin === true || claims.role === 'admin' || email.toLowerCase().includes('admin') ? 'admin' : 'user',
            avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            location: 'Bangalore, India',
            points: 150,
            rating: 5.0,
            _authSource: 'firebase'
          };
          if (window.ShareSphereDB) {
            await window.ShareSphereDB.insert('users', appUser);
          }
        }

        this.setCurrentUser(appUser);
        return { success: true, user: appUser };
      } catch (e) {
        console.warn('Firebase login failed:', e.message);
        return { success: false, error: e.message };
      }
    }

    // 2. Resilient Authentication (synced with shared Server DB)
    if (window.ShareSphereDB && typeof window.ShareSphereDB.syncCollectionFromAPI === 'function') {
      try { await window.ShareSphereDB.syncCollectionFromAPI('users'); } catch (_) {}
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const users = window.ShareSphereDB ? window.ShareSphereDB.getCollection('users') : [];
    let existingUser = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);

    if (existingUser) {
      if (existingUser.password && existingUser.password !== password) {
        return { success: false, error: 'Incorrect password. Please verify and try again.' };
      }
      if (existingUser.status === 'Suspended') {
        return { success: false, error: 'This account has been suspended by an administrator.' };
      }
      this.setCurrentUser(existingUser);
      return { success: true, user: existingUser };
    }

    if (!existingUser) {
      return { success: false, error: 'No account found with this email. Please check your spelling or register a new account.' };
    }
  },

  /**
   * Register new user
   */
  async register(name, email, password, location) {
    const auth = typeof fbAuth !== 'undefined' ? fbAuth : null;

    // 1. Firebase Registration
    if (auth) {
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        const newUser = {
          id: userCredential.user.uid,
          name,
          email: userCredential.user.email,
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user',
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
          _authSource: 'firebase',
          createdAt: new Date().toISOString()
        };

        await window.ShareSphereDB.insert('users', newUser);
        this.setCurrentUser(newUser);
        return { success: true, user: newUser };
      } catch (e) {
        console.warn('Firebase registration failed:', e.message);
        return { success: false, error: e.message };
      }
    }

    // 2. Resilient Registration (synced with shared Server DB)
    if (window.ShareSphereDB && typeof window.ShareSphereDB.syncCollectionFromAPI === 'function') {
      try { await window.ShareSphereDB.syncCollectionFromAPI('users'); } catch (_) {}
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const users = window.ShareSphereDB ? window.ShareSphereDB.getCollection('users') : [];
    const existing = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);

    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: normalizedEmail.includes('admin') ? 'admin' : 'user',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
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

    if (window.ShareSphereDB) {
      await window.ShareSphereDB.insert('users', newUser);
    }
    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
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
      const pageName = window.location.pathname.split('/').pop() || 'index.html';
      const search = window.location.search || '';
      window.location.href = `login.html?redirect=${encodeURIComponent(pageName + search)}`;
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

          <!-- User Menu Dropdown -->
          <div class="dropdown">
            <button class="btn p-0 border-0 d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="User Menu">
              <img src="${user.avatar}" alt="${user.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
            </button>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-custom">
              <li class="px-3 py-2 border-bottom mb-2">
                <div class="fw-bold text-dark">${user.name}</div>
                <div class="small text-muted text-truncate">${user.email}</div>
                <div class="badge bg-success-subtle text-success mt-1">🌱 ${user.points || 0} Impact Points</div>
              </li>
              <li><a class="dropdown-item dropdown-item-custom" href="profile.html"><i class="bi bi-person-circle text-primary"></i> My Profile</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="donations.html"><i class="bi bi-box2-heart text-success"></i> My Donations</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="requests.html"><i class="bi bi-arrow-left-right text-info"></i> My Requests</a></li>
              <li><a class="dropdown-item dropdown-item-custom" href="wishlist.html"><i class="bi bi-heart text-danger"></i> Wishlist</a></li>
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
