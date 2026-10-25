/**
 * ShareSphere - Donations Engine: Multi-Step Donation Wizard & Donor Management
 * Powered by Cloudinary Image Storage & Firebase Realtime Database
 */

let donationFormData = {
  category: 'Books',
  title: '',
  description: '',
  quantity: 1,
  condition: 'Good Condition',
  expiryDate: null,
  images: [],
  latitude: 12.9716,
  longitude: 77.5946,
  location: 'Local Community Area'
};

let currentWizardStep = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('donate-wizard-container')) {
    initDonateWizard();
  }
  if (document.getElementById('my-donations-list')) {
    initMyDonationsPage();
  }
});

/* ==========================================================================
   Multi-Step Wizard Engine (donate.html)
   ========================================================================== */

function initDonateWizard() {
  const user = window.ShareSphereAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html?redirect=donate.html';
    return;
  }

  // Pre-fill user neighborhood location
  if (user.location) {
    donationFormData.location = user.location;
    const locInput = document.getElementById('form-location-name');
    if (locInput) locInput.value = user.location;
  }

  setupStepNavigation();
  setupCategorySelection();
  setupImageUploader();
  setupLocationAutofill();

  // Set default initial step
  window.goToWizardStep(1);
}

// Global Category Picker Handler
window.selectWizardCategory = function(cat, element) {
  donationFormData.category = cat;
  
  const allCards = document.querySelectorAll('.category-picker-card');
  allCards.forEach(c => c.classList.remove('selected'));
  
  if (element) {
    element.classList.add('selected');
  }

  // Toggle expiry date field visibility for food
  const expiryContainer = document.getElementById('expiry-date-container');
  if (expiryContainer) {
    expiryContainer.style.display = (cat === 'Food') ? 'block' : 'none';
  }
};

function setupCategorySelection() {
  const catCards = document.querySelectorAll('.category-picker-card');
  catCards.forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-cat') || 'Other';
      window.selectWizardCategory(cat, card);
    });
  });
}

// Global Step Switcher with Strict Sequential Validation
window.goToWizardStep = function(stepNumber) {
  if (stepNumber < 1 || stepNumber > 5) return;

  // Prevent navigation while photos are uploading
  if (window.isUploadingPhotos) {
    window.ShareSphereUtils.showToast('Please wait for photos to finish uploading.', 'warning');
    return;
  }

  // Prevent skipping: Validate all intermediate steps before jumping forward
  if (stepNumber > currentWizardStep) {
    for (let s = currentWizardStep; s < stepNumber; s++) {
      if (!validateCurrentStep(s)) {
        return; // stay on invalid step
      }
    }
  }

  currentWizardStep = stepNumber;

  // Update step cards visibility
  for (let i = 1; i <= 5; i++) {
    const pane = document.getElementById(`wizard-step-${i}`);
    const node = document.getElementById(`step-node-${i}`);
    if (pane) {
      pane.style.display = (i === stepNumber) ? 'block' : 'none';
    }
    if (node) {
      if (i < stepNumber) {
        node.className = 'wizard-step-node completed';
      } else if (i === stepNumber) {
        node.className = 'wizard-step-node active';
      } else {
        node.className = 'wizard-step-node';
      }
    }
  }

  // Update progress bar fill
  const fill = document.getElementById('wizard-progress-fill');
  if (fill) {
    const pct = ((stepNumber - 1) / 4) * 100;
    fill.style.width = `${pct}%`;
  }

  // Step 5 Review population
  if (stepNumber === 5) {
    populateReviewSummary();
  }

  window.scrollTo({ top: 120, behavior: 'smooth' });
};

// Global Next Step Handler
window.handleWizardNext = function() {
  if (window.isUploadingPhotos) {
    window.ShareSphereUtils.showToast('Photos are currently uploading. Please wait a moment...', 'warning');
    return;
  }
  if (validateCurrentStep(currentWizardStep)) {
    window.goToWizardStep(currentWizardStep + 1);
  }
};

// Global Prev Step Handler
window.handleWizardPrev = function() {
  window.goToWizardStep(currentWizardStep - 1);
};

function setupStepNavigation() {
  const nextBtns = document.querySelectorAll('[data-wizard-next]');
  const prevBtns = document.querySelectorAll('[data-wizard-prev]');

  nextBtns.forEach(btn => {
    btn.onclick = () => window.handleWizardNext();
  });

  prevBtns.forEach(btn => {
    btn.onclick = () => window.handleWizardPrev();
  });

  const publishBtn = document.getElementById('btn-publish-donation');
  if (publishBtn) {
    publishBtn.onclick = handlePublishDonation;
  }
}

function validateCurrentStep(step) {
  if (step === 1) {
    if (!donationFormData.category) {
      window.ShareSphereUtils.showToast('Please select a resource category.', 'warning');
      return false;
    }
    return true;
  }

  if (step === 2) {
    const titleInput = document.getElementById('form-title');
    const descInput = document.getElementById('form-description');
    const qtyInput = document.getElementById('form-quantity');
    const condInput = document.getElementById('form-condition');

    const title = titleInput?.value.trim();
    const desc = descInput?.value.trim();
    const qty = parseInt(qtyInput?.value) || 0;
    const cond = condInput?.value || 'Good Condition';

    if (!title || title.length < 3) {
      window.ShareSphereUtils.showToast('Please enter an item title (at least 3 characters).', 'warning');
      titleInput?.focus();
      return false;
    }

    if (!desc || desc.length < 8) {
      window.ShareSphereUtils.showToast('Please provide a helpful description (at least 8 characters).', 'warning');
      descInput?.focus();
      return false;
    }

    if (qty < 1) {
      window.ShareSphereUtils.showToast('Quantity must be at least 1.', 'warning');
      qtyInput?.focus();
      return false;
    }

    donationFormData.title = title;
    donationFormData.description = desc;
    donationFormData.quantity = qty;
    donationFormData.condition = cond;

    if (donationFormData.category === 'Food') {
      const expInput = document.getElementById('form-expiry');
      const exp = expInput?.value;
      if (!exp) {
        window.ShareSphereUtils.showToast('Food Expiry / Best Before Date is mandatory.', 'warning');
        expInput?.focus();
        return false;
      }
      const expDate = new Date(exp);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        window.ShareSphereUtils.showToast('Food expiry date cannot be in the past.', 'error');
        expInput?.focus();
        return false;
      }
      donationFormData.expiryDate = exp;
    } else {
      donationFormData.expiryDate = null;
    }
    return true;
  }

  if (step === 3) {
    if (window.isUploadingPhotos) {
      window.ShareSphereUtils.showToast('Photos are still uploading. Please wait...', 'warning');
      return false;
    }
    // High-resolution category-tailored default image if donor uploaded no photos
    if (!donationFormData.images || donationFormData.images.length === 0) {
      const fallbackImages = {
        'Food': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        'Clothes': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80',
        'Books': 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80',
        'Electronics': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
        'Furniture': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
        'Toys': 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80',
        'Other': 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80'
      };
      donationFormData.images = [fallbackImages[donationFormData.category] || fallbackImages['Other']];
    }
    return true;
  }

  if (step === 4) {
    const locInput = document.getElementById('form-location-name');
    const loc = locInput?.value.trim();
    if (!loc || loc.length < 3) {
      window.ShareSphereUtils.showToast('Please enter your neighborhood area or landmark.', 'warning');
      locInput?.focus();
      return false;
    }
    donationFormData.location = loc;
    if (!donationFormData.latitude || !donationFormData.longitude) {
      const userLoc = window.ShareSphereLocation ? window.ShareSphereLocation.getUserLocation() : null;
      donationFormData.latitude = (userLoc && userLoc.lat) || 12.9716;
      donationFormData.longitude = (userLoc && userLoc.lng) || 77.5946;
    }
    return true;
  }

  return true;
}

/**
 * Cloudinary Integrated Image Uploader with Race Condition Prevention
 */
window.isUploadingPhotos = false;

function setupImageUploader() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('image-file-input');
  const previewGrid = document.getElementById('preview-images-grid');

  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => {
    if (window.isUploadingPhotos) return;
    fileInput.click();
  };

  dropzone.ondragover = (e) => {
    e.preventDefault();
    if (!window.isUploadingPhotos) dropzone.classList.add('dragover');
  };

  dropzone.ondragleave = () => {
    dropzone.classList.remove('dragover');
  };

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (window.isUploadingPhotos) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files && fileInput.files.length) {
      processUploadedFiles(fileInput.files);
    }
  };

  function setUploadLockState(isUploading, text = 'Uploading photos...') {
    window.isUploadingPhotos = isUploading;
    const uploadStatus = document.getElementById('upload-status-indicator');
    const step3Btns = document.querySelectorAll('#wizard-step-3 button, [data-wizard-next]');
    const publishBtn = document.getElementById('btn-publish-donation');

    step3Btns.forEach(btn => {
      btn.disabled = isUploading;
      if (isUploading && btn.classList.contains('btn-primary-custom')) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Uploading Photos...';
      } else if (!isUploading && btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
      }
    });

    if (publishBtn) publishBtn.disabled = isUploading;
    if (dropzone) {
      dropzone.style.pointerEvents = isUploading ? 'none' : 'auto';
      dropzone.style.opacity = isUploading ? '0.6' : '1';
    }

    if (uploadStatus) {
      if (isUploading) {
        uploadStatus.innerHTML = `<span class="spinner-border spinner-border-sm text-primary me-2"></span> ${text}`;
        uploadStatus.style.display = 'block';
      } else {
        uploadStatus.style.display = 'none';
      }
    }
  }

  async function processUploadedFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setUploadLockState(true, `Uploading ${validFiles.length} photo(s) to Cloudinary...`);

    let uploadedCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadLockState(true, `Uploading photo (${i + 1} of ${validFiles.length}) to Cloudinary...`);
      try {
        const secureUrl = await window.ShareSphereCloudinary.upload(file);
        if (secureUrl) {
          // If default placeholder was auto-assigned earlier, clear it
          if (donationFormData.images.length === 1 && donationFormData.images[0].includes('unsplash.com')) {
            donationFormData.images = [];
          }
          donationFormData.images.push(secureUrl);
          uploadedCount++;
        }
      } catch (err) {
        console.warn('Upload error for file:', err);
      }
    }

    setUploadLockState(false);
    window.ShareSphereUtils.showToast(`✓ ${uploadedCount} photo(s) uploaded successfully!`, 'success');
    renderImagePreviews();
  }

  function renderImagePreviews() {
    if (!previewGrid) return;
    previewGrid.innerHTML = donationFormData.images.map((img, idx) => `
      <div class="preview-thumb-box position-relative">
        <img src="${img}" alt="Preview" class="w-100 h-100" style="object-fit: cover;">
        <button type="button" class="preview-remove-btn" onclick="window.removeUploadedImage(${idx})">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `).join('');
  }

  window.removeUploadedImage = (idx) => {
    donationFormData.images.splice(idx, 1);
    renderImagePreviews();
  };
}

function setupLocationAutofill() {
  const btn = document.getElementById('btn-wizard-gps');
  if (!btn) return;

  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Detecting GPS...';
    
    const loc = await window.ShareSphereLocation.requestCurrentPosition();
    donationFormData.latitude = loc.lat;
    donationFormData.longitude = loc.lng;

    const locInput = document.getElementById('form-location-name');
    if (locInput) locInput.value = loc.address || 'Detected Neighborhood Location';

    const coordsDisplay = document.getElementById('gps-coords-display');
    if (coordsDisplay) {
      coordsDisplay.textContent = `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)} (10 km Zone Active)`;
      coordsDisplay.style.display = 'block';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-geo-alt-fill text-success"></i> Location Captured!';
  };
}

function populateReviewSummary() {
  const container = document.getElementById('review-summary-card');
  if (!container) return;

  const meta = window.ShareSphereUtils.getCategoryMeta(donationFormData.category);
  const user = window.ShareSphereAuth.getCurrentUser();
  const firstImg = donationFormData.images[0] || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80';

  container.innerHTML = `
    <div class="card border-0 shadow-sm p-4 rounded-4 bg-light">
      <div class="d-flex gap-3 mb-3 flex-wrap flex-sm-nowrap">
        <img src="${firstImg}" class="rounded-3 shadow-sm" style="width: 140px; height: 110px; object-fit: cover;">
        <div>
          <span class="badge bg-primary mb-1">${meta.icon} ${donationFormData.category}</span>
          <h5 class="fw-bold mb-1 text-dark">${donationFormData.title}</h5>
          <div class="small text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger"></i> ${donationFormData.location}</div>
          <div class="d-flex gap-2 flex-wrap">
            <span class="badge bg-white text-dark border">${donationFormData.condition}</span>
            <span class="badge bg-white text-dark border">Qty: ${donationFormData.quantity}</span>
            ${donationFormData.expiryDate ? `<span class="badge bg-danger text-white">Exp: ${donationFormData.expiryDate}</span>` : ''}
          </div>
        </div>
      </div>
      <p class="small text-muted mb-3">${donationFormData.description}</p>
      <div class="p-3 rounded-3 bg-white border d-flex align-items-center justify-content-between small text-muted">
        <div>Donor: <b class="text-dark">${user ? user.name : 'Community Member'}</b></div>
        <div>Network: <span class="badge bg-success-subtle text-success"><i class="bi bi-broadcast"></i> Live Multi-User Sync</span></div>
      </div>
    </div>
  `;
}

let isPublishingDonation = false;

async function handlePublishDonation() {
  // Prevent duplicate submissions / debouncing guard
  if (isPublishingDonation) return;

  // Validate all steps strictly
  for (let s = 1; s <= 4; s++) {
    if (!validateCurrentStep(s)) {
      window.goToWizardStep(s);
      return;
    }
  }

  if (window.isUploadingPhotos) {
    window.ShareSphereUtils.showToast('Please wait for photos to finish uploading.', 'warning');
    return;
  }

  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  const btn = document.getElementById('btn-publish-donation');
  isPublishingDonation = true;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Broadcasting to Community Network...';
  }

  try {
    const newDonation = {
      donorId: user.id,
      donorName: user.name,
      donorAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      donorRating: user.rating || 5.0,
      title: donationFormData.title,
      description: donationFormData.description,
      category: donationFormData.category,
      quantity: donationFormData.quantity,
      condition: donationFormData.condition,
      imageUrls: donationFormData.images,
      latitude: donationFormData.latitude,
      longitude: donationFormData.longitude,
      location: donationFormData.location,
      expiryDate: donationFormData.expiryDate,
      status: 'Available',
      requestsCount: 0
    };

    // Save to shared database (Spring Boot, Express, or Cloud Firestore)
    await window.ShareSphereDB.insert('donations', newDonation);

    // Award +50 impact points ONCE
    const currentPoints = (user.points || 0) + 50;
    const currentDonCount = (user.donationsCount || 0) + 1;
    await window.ShareSphereDB.update('users', user.id, { 
      points: currentPoints,
      donationsCount: currentDonCount
    });
    user.points = currentPoints;
    user.donationsCount = currentDonCount;
    window.ShareSphereAuth.setCurrentUser(user);

    // Celebration
    if (typeof confetti === 'function') {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }

    window.ShareSphereUtils.showToast('🎉 Donation published! Visible to all users across the platform.', 'success');

    setTimeout(() => {
      window.location.href = 'explore.html';
    }, 1200);
  } catch (error) {
    console.error('Failed to publish donation:', error);
    window.ShareSphereUtils.showToast('Failed to publish donation. Please try again.', 'error');
    isPublishingDonation = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Publish Donation Now';
    }
  }
}

/* ==========================================================================
   My Donations Page Logic (donations.html)
   ========================================================================== */
function initMyDonationsPage() {
  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  renderMyDonations('All');

  // Live updates
  window.addEventListener('sharesphere_data_changed', (e) => {
    if (!e.detail || e.detail.collection === 'donations' || e.detail.collection === 'requests') {
      const activeTab = document.querySelector('[data-status-tab].active');
      const status = activeTab ? activeTab.getAttribute('data-status-tab') : 'All';
      renderMyDonations(status);
    }
  });

  const tabBtns = document.querySelectorAll('[data-status-tab]');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.getAttribute('data-status-tab');
      renderMyDonations(status);
    };
  });
}

function renderMyDonations(filterStatus) {
  const container = document.getElementById('my-donations-list');
  if (!container) return;

  const user = window.ShareSphereAuth.getCurrentUser();
  let donations = window.ShareSphereDB.getCollection('donations').filter(d => d.donorId === user.id);
  const allRequests = window.ShareSphereDB.getCollection('requests');

  if (filterStatus !== 'All') {
    donations = donations.filter(d => d.status === filterStatus);
  }

  if (donations.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box">
          <span class="empty-state-icon">📦</span>
          <h4 class="empty-state-title">No donations in this view</h4>
          <p class="empty-state-text">Your donated resources will appear here once you list them.</p>
          <a href="donate.html" class="btn btn-primary-custom">
            <i class="bi bi-plus-circle"></i> Donate an Item
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = donations.map(item => {
    const meta = window.ShareSphereUtils.getCategoryMeta(item.category);
    const incomingReqs = allRequests.filter(r => r.donationId === item.id);
    const hasPendingReqs = incomingReqs.some(r => r.status === 'Requested');

    return `
      <div class="col-lg-6 mb-4">
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100 bg-white">
          <div class="row g-0 h-100">
            <div class="col-sm-5 position-relative">
              <img src="${(item.imageUrls && item.imageUrls[0]) || ''}" class="w-100 h-100" style="object-fit: cover; min-height: 180px;">
              <span class="category-badge-chip">
                <span>${meta.icon}</span> <span>${item.category}</span>
              </span>
            </div>
            <div class="col-sm-7 p-3 d-flex flex-column justify-content-between">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="status-badge-overlay ${item.status.toLowerCase()} position-static">
                    ${item.status}
                  </span>
                  <small class="text-muted">${window.ShareSphereUtils.timeAgo(item.createdAt)}</small>
                </div>
                <h6 class="fw-bold text-dark mb-1">${item.title}</h6>
                <p class="small text-muted text-truncate mb-2">${item.description}</p>
                <div class="small text-muted mb-2">
                  <i class="bi bi-geo-alt"></i> ${item.location} • Qty: ${item.quantity}
                </div>
              </div>

              <div>
                ${incomingReqs.length > 0 ? `
                  <button class="btn btn-sm ${hasPendingReqs ? 'btn-warning' : 'btn-outline-primary'} w-100 mb-2" onclick="openDonorRequestsModal('${item.id}')">
                    <i class="bi bi-people-fill"></i> ${incomingReqs.length} ${incomingReqs.length === 1 ? 'Request' : 'Requests'} Received
                  </button>
                ` : `
                  <div class="small text-muted fst-italic mb-2">No requests received yet</div>
                `}

                <div class="d-flex gap-2">
                  <a href="donation-details.html?id=${item.id}" class="btn btn-sm btn-outline-secondary flex-grow-1">
                    <i class="bi bi-eye"></i> View
                  </a>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteMyDonation('${item.id}')" title="Delete Donation">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteMyDonation = async (id) => {
  if (confirm('Are you sure you want to remove this donation?')) {
    await window.ShareSphereDB.delete('donations', id);
    window.ShareSphereUtils.showToast('Donation removed successfully.', 'info');
    renderMyDonations('All');
  }
};

window.openDonorRequestsModal = (donationId) => {
  const donation = window.ShareSphereDB.findById('donations', donationId);
  const requests = window.ShareSphereDB.getCollection('requests').filter(r => r.donationId === donationId);
  const container = document.getElementById('donor-requests-modal-body');
  if (!container || !donation) return;

  document.getElementById('modal-donation-title').textContent = donation.title;

  container.innerHTML = requests.map(req => `
    <div class="card p-3 border rounded-3 mb-3 bg-light">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="d-flex align-items-center gap-2">
          <img src="${req.requesterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover;">
          <div>
            <div class="fw-bold small">${req.requesterName}</div>
            <div class="text-muted" style="font-size: 0.72rem;">${window.ShareSphereUtils.timeAgo(req.createdAt)}</div>
          </div>
        </div>
        <span class="badge ${req.status === 'Accepted' ? 'bg-success' : req.status === 'Requested' ? 'bg-warning text-dark' : 'bg-secondary'}">${req.status}</span>
      </div>
      <p class="small text-muted mb-2">"${req.message}"</p>
      <div class="small text-muted mb-2"><b>Quantity needed:</b> ${req.quantity}</div>
      ${req.status === 'Requested' ? `
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success flex-grow-1" onclick="handleAcceptRequest('${req.id}', '${donationId}')">
            <i class="bi bi-check-lg"></i> Accept Request
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="handleRejectRequest('${req.id}', '${donationId}')">
            <i class="bi bi-x-lg"></i> Reject
          </button>
        </div>
      ` : `
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary-custom flex-grow-1" onclick="window.ShareSphereChat.openChat('${req.id}', '${req.requesterName}')">
            <i class="bi bi-chat-dots-fill"></i> Chat with Requester
          </button>
        </div>
      `}
    </div>
  `).join('');

  const modal = new bootstrap.Modal(document.getElementById('donorRequestsModal'));
  modal.show();
};

window.handleAcceptRequest = async (requestId, donationId) => {
  await window.ShareSphereDB.update('requests', requestId, { status: 'Accepted' });
  await window.ShareSphereDB.update('donations', donationId, { status: 'Reserved' });

  const req = window.ShareSphereDB.findById('requests', requestId);
  if (req) {
    await window.ShareSphereDB.insert('notifications', {
      userId: req.requesterId,
      type: 'accepted',
      title: 'Request Accepted! 🎉',
      message: `Your request for "${req.donationTitle}" was accepted. You can coordinate pickup now!`,
      link: 'requests.html',
      isRead: false
    });
  }

  window.ShareSphereUtils.showToast('Request Accepted! Resource is now Reserved.', 'success');
  openDonorRequestsModal(donationId);
  renderMyDonations('All');
};

window.handleRejectRequest = async (requestId, donationId) => {
  await window.ShareSphereDB.update('requests', requestId, { status: 'Rejected' });
  window.ShareSphereUtils.showToast('Request was rejected.', 'info');
  openDonorRequestsModal(donationId);
};
