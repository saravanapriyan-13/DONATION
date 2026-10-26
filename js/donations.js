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
    const latInput = document.getElementById('form-latitude');
    const lngInput = document.getElementById('form-longitude');

    const loc = locInput?.value.trim();
    if (!loc || loc.length < 3) {
      window.ShareSphereUtils.showToast('Please enter your neighborhood area or landmark.', 'warning');
      locInput?.focus();
      return false;
    }
    donationFormData.location = loc;

    // Read manual or captured coordinates
    let lat = latInput && latInput.value !== '' ? parseFloat(latInput.value) : donationFormData.latitude;
    let lng = lngInput && lngInput.value !== '' ? parseFloat(lngInput.value) : donationFormData.longitude;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      const userLoc = window.ShareSphereLocation ? window.ShareSphereLocation.getUserLocation() : null;
      lat = (userLoc && Number.isFinite(userLoc.lat)) ? userLoc.lat : 12.9716;
      lng = (userLoc && Number.isFinite(userLoc.lng)) ? userLoc.lng : 77.5946;
    }

    donationFormData.latitude = lat;
    donationFormData.longitude = lng;
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
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
  const locInput = document.getElementById('form-location-name');
  const latInput = document.getElementById('form-latitude');
  const lngInput = document.getElementById('form-longitude');
  const coordsDisplay = document.getElementById('gps-coords-display');

  // Sync inputs if already present
  if (latInput && !latInput.value && donationFormData.latitude) {
    latInput.value = Number(donationFormData.latitude).toFixed(6);
  }
  if (lngInput && !lngInput.value && donationFormData.longitude) {
    lngInput.value = Number(donationFormData.longitude).toFixed(6);
  }

  // Handle manual coordinate changes
  if (latInput) {
    latInput.addEventListener('input', () => {
      const val = parseFloat(latInput.value);
      if (Number.isFinite(val) && val >= -90 && val <= 90) {
        donationFormData.latitude = val;
        if (coordsDisplay) {
          coordsDisplay.innerHTML = `<i class="bi bi-geo-alt-fill text-success me-1"></i> <b>Manual Coordinates:</b> ${val.toFixed(5)}° N, ${(donationFormData.longitude || 0).toFixed(5)}° E`;
          coordsDisplay.style.display = 'block';
        }
      }
    });
  }

  if (lngInput) {
    lngInput.addEventListener('input', () => {
      const val = parseFloat(lngInput.value);
      if (Number.isFinite(val) && val >= -180 && val <= 180) {
        donationFormData.longitude = val;
        if (coordsDisplay) {
          coordsDisplay.innerHTML = `<i class="bi bi-geo-alt-fill text-success me-1"></i> <b>Manual Coordinates:</b> ${(donationFormData.latitude || 0).toFixed(5)}° N, ${val.toFixed(5)}° E`;
          coordsDisplay.style.display = 'block';
        }
      }
    });
  }

  // Handle neighborhood address blur / geocoding lookup fallback
  if (locInput) {
    locInput.addEventListener('blur', async () => {
      const query = locInput.value.trim();
      if (query.length >= 3 && window.ShareSphereLocation && typeof window.ShareSphereLocation.geocodeAddress === 'function') {
        try {
          const result = await window.ShareSphereLocation.geocodeAddress(query);
          if (result && Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
            donationFormData.latitude = result.lat;
            donationFormData.longitude = result.lng;
            donationFormData.location = query;
            if (latInput) latInput.value = result.lat.toFixed(6);
            if (lngInput) lngInput.value = result.lng.toFixed(6);
            if (coordsDisplay) {
              coordsDisplay.innerHTML = `<i class="bi bi-geo-alt-fill text-info me-1"></i> <b>Location Resolved:</b> ${result.lat.toFixed(5)}° N, ${result.lng.toFixed(5)}° E <br><small class="text-zinc-300">${result.displayName || query}</small>`;
              coordsDisplay.style.display = 'block';
            }
          }
        } catch (_) {}
      }
    });
  }

  if (!btn) return;

  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Fetching Exact High-Accuracy GPS...';
    
    try {
      const loc = await window.ShareSphereLocation.requestCurrentPosition();
      donationFormData.latitude = loc.lat;
      donationFormData.longitude = loc.lng;
      donationFormData.location = loc.address;

      if (locInput) {
        locInput.value = loc.address;
        locInput.style.borderColor = '#10B981';
      }
      if (latInput) latInput.value = loc.lat.toFixed(6);
      if (lngInput) lngInput.value = loc.lng.toFixed(6);

      if (coordsDisplay) {
        coordsDisplay.innerHTML = `<i class="bi bi-geo-alt-fill text-success me-1"></i> <b>Exact Coordinates:</b> ${loc.lat.toFixed(5)}° N, ${loc.lng.toFixed(5)}° E <br><small class="text-emerald-400 opacity-90">${loc.address}</small>`;
        coordsDisplay.style.display = 'block';
      }

      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> Exact GPS Captured!';
      window.ShareSphereUtils.showToast('✓ Accurate GPS location captured successfully!', 'success');
    } catch (e) {
      console.warn('GPS location error:', e);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-geo-alt"></i> Auto-Detect My Current Location';
      window.ShareSphereUtils.showToast('Could not get automatic GPS. You can enter neighborhood or coordinates manually.', 'info');
    }
  };
}

function populateReviewSummary() {
  const container = document.getElementById('review-summary-card');
  if (!container) return;

  const meta = window.ShareSphereUtils.getCategoryMeta(donationFormData.category);
  const user = window.ShareSphereAuth.getCurrentUser();
  const firstImg = donationFormData.images[0] || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=600&q=80';

  container.innerHTML = `
    <div class="card border-0 shadow-sm p-4 rounded-4" style="background: rgba(18, 20, 29, 0.75); border: 1px solid rgba(255,255,255,0.08);">
      <div class="d-flex gap-3 mb-3 flex-wrap flex-sm-nowrap">
        <img src="${firstImg}" class="rounded-3 shadow-sm" style="width: 140px; height: 110px; object-fit: cover;">
        <div>
          <span class="badge bg-primary mb-1">${meta.icon} ${donationFormData.category}</span>
          <h5 class="fw-bold mb-1 text-white">${donationFormData.title}</h5>
          <div class="small text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger"></i> ${donationFormData.location}</div>
          <div class="d-flex gap-2 flex-wrap">
            <span class="badge bg-dark text-light border border-secondary">${donationFormData.condition}</span>
            <span class="badge bg-dark text-light border border-secondary">Qty: ${donationFormData.quantity}</span>
            ${donationFormData.expiryDate ? `<span class="badge bg-danger text-white">Exp: ${donationFormData.expiryDate}</span>` : ''}
          </div>
        </div>
      </div>
      <p class="small text-muted mb-3">${donationFormData.description}</p>
      <div class="p-3 rounded-3 border d-flex align-items-center justify-content-between small text-muted" style="background: rgba(24, 27, 38, 0.6); border-color: rgba(255,255,255,0.06) !important;">
        <div>Donor: <b class="text-white">${user ? user.name : 'Community Member'}</b></div>
        <div>Network: <span class="badge bg-success-subtle text-success"><i class="bi bi-broadcast"></i> Live Multi-Device Sync</span></div>
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
    const donationId = 'don_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newDonation = {
      id: donationId,
      donorId: user.uid || user.id || 'usr_' + Date.now(),
      donorName: user.name || user.displayName || 'Community Member',
      donorEmail: user.email || '',
      donorAvatar: user.avatar || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
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
      requestsCount: 0,
      createdAt: new Date().toISOString()
    };

    // Save to shared database (Express server, Firestore, and memory)
    await window.ShareSphereDB.insert('donations', newDonation);

    // Clean up legacy device-specific ID storage to prevent cross-account leaks
    try {
      localStorage.removeItem('sharesphere_my_donations_ids');
    } catch (_) {}

    // Force background push to server
    if (window.ShareSphereDB && typeof window.ShareSphereDB.syncAllFromAPI === 'function') {
      window.ShareSphereDB.syncAllFromAPI().catch(() => {});
    }

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

    window.ShareSphereUtils.showToast('🎉 Donation published! Broadcasted live to all community members.', 'success');

    setTimeout(() => {
      window.location.href = 'donations.html';
    }, 1100);
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
  const user = window.ShareSphereAuth.getCurrentUser();
  renderMyDonations('All');

  // Immediately pull latest donations from server
  if (window.ShareSphereDB && typeof window.ShareSphereDB.syncAllFromAPI === 'function') {
    window.ShareSphereDB.syncAllFromAPI().then(() => {
      const activeTab = document.querySelector('[data-status-tab].active');
      const status = activeTab ? activeTab.getAttribute('data-status-tab') : 'All';
      renderMyDonations(status);
    });
  }

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
  if (!user) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="empty-state-box p-5 rounded-4 border border-secondary border-opacity-25" style="background: rgba(18, 20, 29, 0.85);">
          <div class="mb-3" style="font-size: 2.5rem;">🔒</div>
          <h4 class="fw-bold text-white mb-2">Sign in to view your donations</h4>
          <p class="empty-state-text text-zinc-300 mb-4">Please log in to manage your listed community items and review requests.</p>
          <a href="login.html?redirect=donations.html" class="btn btn-primary-custom px-4 py-2">
            <i class="bi bi-box-arrow-in-right me-1"></i> Sign In to My Account
          </a>
        </div>
      </div>
    `;
    return;
  }

  const allDonations = window.ShareSphereDB.getCollection('donations');
  const allRequests = window.ShareSphereDB.getCollection('requests');
  const currentUid = String(user.uid || user.id);

  // Strict cross-account filtering: item belongs STRICTLY to the currently logged-in user
  let donations = allDonations.filter(d => {
    if (!d || !d.id) return false;
    // Don't show dummy seed items
    if (d.id.startsWith('don_seed_')) return false;

    const donorId = String(d.donorId || '');
    return donorId === currentUid || (user.id && donorId === String(user.id)) || (user.uid && donorId === String(user.uid));
  });

  if (filterStatus !== 'All') {
    donations = donations.filter(d => (d.status || '').toLowerCase() === filterStatus.toLowerCase());
  }

  if (donations.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box p-5 rounded-4 text-center border border-secondary border-opacity-25" style="background: rgba(18, 20, 29, 0.85);">
          <span class="empty-state-icon" style="font-size: 3rem;">📦</span>
          <h4 class="empty-state-title text-white mt-3 mb-2">No donations in this view</h4>
          <p class="empty-state-text text-zinc-300 mb-4">Your donated resources will appear here once you list them.</p>
          <a href="donate.html" class="btn btn-primary-custom px-4 py-2">
            <i class="bi bi-plus-circle me-1"></i> Donate an Item Now
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
        <div class="card border-0 shadow-xl rounded-4 overflow-hidden h-100 resource-card" style="background: rgba(18, 20, 29, 0.85); border: 1px solid rgba(255, 255, 255, 0.08);">
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
                  <small class="text-zinc-300 font-medium">${window.ShareSphereUtils.timeAgo(item.createdAt)}</small>
                </div>
                <h6 class="fw-bold text-white mb-1">${item.title}</h6>
                <p class="small text-zinc-300 text-truncate mb-2">${item.description}</p>
                <div class="small text-zinc-300 mb-2">
                  <i class="bi bi-geo-alt-fill text-emerald-400"></i> ${item.location} • Qty: ${item.quantity}
                </div>
              </div>

              <div>
                ${incomingReqs.length > 0 ? `
                  <button class="btn btn-sm ${hasPendingReqs ? 'btn-warning' : 'btn-outline-primary'} w-100 mb-2" onclick="openDonorRequestsModal('${item.id}')">
                    <i class="bi bi-people-fill"></i> ${incomingReqs.length} ${incomingReqs.length === 1 ? 'Request' : 'Requests'} Received
                  </button>
                ` : `
                  <div class="small text-zinc-400 fst-italic mb-2">No requests received yet</div>
                `}

                <div class="d-flex gap-2">
                  <a href="donation-details.html?id=${item.id}" class="btn btn-sm btn-outline-light border-secondary flex-grow-1">
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
    <div class="card p-3 border rounded-3 mb-3" style="background: rgba(24, 28, 44, 0.95); border-color: rgba(255,255,255,0.12) !important;">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="d-flex align-items-center gap-2">
          <img src="${req.requesterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover;">
          <div>
            <div class="fw-bold small text-white">${req.requesterName}</div>
            <div class="text-zinc-400" style="font-size: 0.72rem;">${window.ShareSphereUtils.timeAgo(req.createdAt)}</div>
          </div>
        </div>
        <span class="badge ${req.status === 'Accepted' ? 'bg-success' : req.status === 'Requested' ? 'bg-warning text-dark' : 'bg-secondary'}">${req.status}</span>
      </div>
      <p class="small text-zinc-200 mb-2">"${req.message}"</p>
      <div class="small text-zinc-300 mb-2"><b>Quantity needed:</b> ${req.quantity}</div>
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
