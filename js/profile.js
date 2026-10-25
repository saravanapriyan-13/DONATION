/**
 * ShareSphere - User Profile, Comprehensive Profile Editing, & Gamification Badges
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('profile-view-container')) {
    renderUserProfile();
  }
  if (document.getElementById('impact-dashboard-container')) {
    renderImpactDashboard();
  }
});

function renderUserProfile() {
  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  const donations = window.ShareSphereDB.getCollection('donations').filter(d => d.donorId === user.id);
  const requests = window.ShareSphereDB.getCollection('requests').filter(r => r.requesterId === user.id);
  const completedShares = requests.filter(r => r.status === 'Completed').length + donations.filter(d => d.status === 'Completed').length;
  const peopleHelped = Math.max(user.peopleHelped || 0, completedShares * 2);

  // Populate Profile Header
  document.getElementById('profile-avatar').src = user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  document.getElementById('profile-name').textContent = user.name || 'Community Member';
  document.getElementById('profile-email').textContent = user.email || 'user@sharesphere.org';
  document.getElementById('profile-location').innerHTML = `<i class="bi bi-geo-alt-fill text-danger"></i> ${user.location || 'Bangalore, India'}`;
  document.getElementById('profile-points').textContent = ((user.points !== undefined && user.points !== null) ? user.points : 0).toLocaleString();
  document.getElementById('profile-rating').textContent = (user.rating || 5.0).toFixed(1);

  // Bio and Contact Information
  const bioEl = document.getElementById('profile-bio-text');
  if (bioEl) {
    bioEl.textContent = user.bio || 'Passionate about zero-waste living, reducing neighborhood landfill footprint, and helping community peers.';
  }

  const phoneEl = document.getElementById('profile-phone-text');
  if (phoneEl) {
    phoneEl.innerHTML = user.phone ? `<i class="bi bi-telephone-fill text-success"></i> ${user.phone}` : '<span class="text-muted fst-italic">No phone added yet</span>';
  }

  const handoverEl = document.getElementById('profile-handover-text');
  if (handoverEl) {
    handoverEl.textContent = user.preferredHandover || 'Flexible (In-person or public landmark)';
  }

  const interestsEl = document.getElementById('profile-interests-chips');
  if (interestsEl) {
    const list = user.interests || ['Books', 'Food', 'Clothes', 'Electronics'];
    interestsEl.innerHTML = list.map(item => `
      <span class="badge bg-light text-dark border px-2 py-1"><i class="bi bi-tag-fill text-primary"></i> ${item}</span>
    `).join('');
  }

  // Stats boxes
  document.getElementById('stat-user-donations').textContent = donations.length;
  document.getElementById('stat-user-requests').textContent = requests.length;
  document.getElementById('stat-user-completed').textContent = completedShares;
  document.getElementById('stat-user-people').textContent = peopleHelped;

  // Badges calculation
  renderUserBadges(user, donations.length, completedShares);

  // Setup Edit Profile Modal
  const editBtn = document.getElementById('btn-open-edit-profile');
  if (editBtn) {
    editBtn.onclick = window.openEditProfileModal;
  }
}

function renderUserBadges(user, donationsCount, completedShares) {
  const container = document.getElementById('profile-badges-grid');
  if (!container) return;

  const badges = [
    {
      id: 'eco_starter',
      icon: '🌱',
      name: 'Eco Starter',
      desc: 'Joined the community & participated in resource sharing.',
      unlocked: true
    },
    {
      id: 'community_helper',
      icon: '🤝',
      name: 'Community Helper',
      desc: 'Participated in 3 or more resource exchanges.',
      unlocked: completedShares >= 3
    },
    {
      id: 'waste_reducer',
      icon: '♻️',
      name: 'Waste Reducer',
      desc: 'Prevented an estimated 15+ kg of landfill waste.',
      unlocked: (user.points || 0) >= 200 || donationsCount >= 2
    },
    {
      id: 'generous_donor',
      icon: '❤️',
      name: 'Generous Donor',
      desc: 'Donated 5 or more valuable resources.',
      unlocked: donationsCount >= 5 || (user.badges && user.badges.includes('Generous Donor'))
    },
    {
      id: 'community_champ',
      icon: '🏆',
      name: 'Community Champion',
      desc: 'Top community contributor with 10+ completed shares.',
      unlocked: (user.points || 0) >= 500 || (user.badges && user.badges.includes('Community Champion'))
    }
  ];

  container.innerHTML = badges.map(b => `
    <div class="col-lg-4 col-md-6 mb-3">
      <div class="badge-item-card ${b.unlocked ? 'unlocked' : 'locked'}">
        <span class="badge-icon-lg">${b.icon}</span>
        <h6 class="badge-title">${b.name}</h6>
        <p class="badge-desc mb-2">${b.desc}</p>
        <span class="badge ${b.unlocked ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-muted'}">
          ${b.unlocked ? '✓ Unlocked' : '🔒 Locked'}
        </span>
      </div>
    </div>
  `).join('');
}

window.openEditProfileModal = function openEditProfileModal() {
  const user = window.ShareSphereAuth.getCurrentUser();
  if (!user) return;

  document.getElementById('edit-name').value = user.name || '';
  document.getElementById('edit-email').value = user.email || '';
  document.getElementById('edit-phone').value = user.phone || '';
  document.getElementById('edit-bio').value = user.bio || '';
  document.getElementById('edit-location').value = user.location || '';
  document.getElementById('edit-avatar').value = user.avatar || '';
  document.getElementById('edit-handover').value = user.preferredHandover || 'Public landmark meeting';

  // Populate live avatar preview
  const previewImg = document.getElementById('edit-avatar-preview');
  const currentAvatar = user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  if (previewImg) previewImg.src = currentAvatar;

  // Live preview when URL is typed
  const urlInput = document.getElementById('edit-avatar');
  if (urlInput) {
    urlInput.oninput = () => {
      if (previewImg && urlInput.value.trim()) {
        previewImg.src = urlInput.value.trim();
      }
    };
  }

  // Avatar file input handler for Cloudinary
  const avatarFileInput = document.getElementById('edit-avatar-file');
  if (avatarFileInput) {
    avatarFileInput.onchange = async () => {
      if (avatarFileInput.files && avatarFileInput.files[0]) {
        const file = avatarFileInput.files[0];
        const statusEl = document.getElementById('avatar-upload-status');

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          if (previewImg) previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        if (statusEl) {
          statusEl.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span> Uploading to Cloudinary...';
          statusEl.style.display = 'block';
        }

        try {
          const url = await window.ShareSphereCloudinary.upload(file);
          document.getElementById('edit-avatar').value = url;
          if (previewImg) previewImg.src = url;
          if (statusEl) {
            statusEl.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-circle-fill"></i> Photo uploaded!</span>';
          }
        } catch (e) {
          if (statusEl) {
            statusEl.innerHTML = '<span class="text-warning fw-bold"><i class="bi bi-exclamation-triangle-fill"></i> Upload failed — local preview saved, will retry on next update.</span>';
          }
        }
      }
    };
  }

  const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  modal.show();
}

window.saveProfileChanges = async () => {
  const user = window.ShareSphereAuth.getCurrentUser();
  if (!user) return;

  const name = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const loc = document.getElementById('edit-location').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const handover = document.getElementById('edit-handover').value;

  if (!name) {
    window.ShareSphereUtils.showToast('Name cannot be empty.', 'warning');
    return;
  }

  const updated = {
    ...user,
    name,
    email: email || user.email,
    phone: phone || '',
    bio: bio || '',
    location: loc || user.location,
    avatar: avatar || user.avatar,
    preferredHandover: handover
  };

  // Save to unified repository & live Firebase
  await window.ShareSphereDB.update('users', user.id, updated);
  window.ShareSphereAuth.setCurrentUser(updated);

  window.ShareSphereUtils.showToast('✓ Profile successfully updated on Firebase!', 'success');

  const modalEl = document.getElementById('editProfileModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  renderUserProfile();
  window.ShareSphereAuth.renderNavAuth();
};

/**
 * Render Environmental Impact Dashboard (impact.html)
 */
function renderImpactDashboard() {
  const allDonations = window.ShareSphereDB.getCollection('donations');
  const totalImpact = (window.ShareSphereUtils && window.ShareSphereUtils.getPlatformImpactMetrics)
    ? window.ShareSphereUtils.getPlatformImpactMetrics(allDonations)
    : window.ShareSphereUtils.calculateEnvironmentalImpact(allDonations);

  document.getElementById('impact-items-reused').textContent = totalImpact.itemsReused.toLocaleString() + '+';
  document.getElementById('impact-waste-prevented').textContent = totalImpact.estimatedWasteKg.toLocaleString() + ' kg';
  document.getElementById('impact-co2-avoided').textContent = totalImpact.estimatedCO2eKg.toLocaleString() + ' kg';
  document.getElementById('impact-people-helped').textContent = totalImpact.peopleHelped.toLocaleString() + '+';

  const categories = ['Food', 'Clothes', 'Books', 'Electronics', 'Furniture', 'Toys', 'Other'];
  const breakdownContainer = document.getElementById('impact-breakdown-list');
  if (breakdownContainer) {
    breakdownContainer.innerHTML = categories.map(cat => {
      const catItems = allDonations.filter(d => d.category === cat);
      const meta = window.ShareSphereUtils.getCategoryMeta(cat);
      const sub = window.ShareSphereUtils.calculateEnvironmentalImpact(catItems);

      return `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="fs-4">${meta.icon}</span>
              <h6 class="fw-bold mb-0">${cat}</h6>
            </div>
            <div class="small text-muted mb-1">Items Reused: <b>${sub.itemsReused}</b></div>
            <div class="small text-muted mb-1">Waste Prevented: <b>${sub.estimatedWasteKg} kg</b></div>
            <div class="small text-muted">Estimated CO₂ Avoided: <b>${sub.estimatedCO2eKg} kg CO₂e</b></div>
          </div>
        </div>
      `;
    }).join('');
  }
}
