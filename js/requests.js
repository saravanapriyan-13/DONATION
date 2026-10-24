/**
 * ShareSphere - Requests System & Status Progression Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('my-requests-list')) {
    renderMyRequests();
  }
});

/**
 * Submit a new request for a resource
 */
function submitResourceRequest(donationId) {
  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  const donation = window.ShareSphereDB.findById('donations', donationId);
  if (!donation) {
    window.ShareSphereUtils.showToast('Resource not found.', 'error');
    return;
  }

  // Prevent requesting your own donation
  if (donation.donorId === user.id) {
    window.ShareSphereUtils.showToast('You cannot request your own donation.', 'warning');
    return;
  }

  const msg = document.getElementById('req-message')?.value.trim();
  const qty = parseInt(document.getElementById('req-quantity')?.value) || 1;
  const time = document.getElementById('req-pickup-time')?.value || 'Flexible';

  if (!msg) {
    window.ShareSphereUtils.showToast('Please include a polite note explaining your need.', 'warning');
    return;
  }

  const newRequest = {
    donationId: donation.id,
    donationTitle: donation.title,
    donationImage: (donation.imageUrls && donation.imageUrls[0]) || '',
    donorId: donation.donorId,
    donorName: donation.donorName,
    donorAvatar: donation.donorAvatar,
    requesterId: user.id,
    requesterName: user.name,
    requesterAvatar: user.avatar,
    quantity: qty,
    message: msg,
    preferredTime: time,
    status: 'Requested',
    pickupDate: null,
    pickupTime: null,
    pickupLocation: donation.location
  };

  window.ShareSphereDB.insert('requests', newRequest);

  // Update donation requests count and status if needed
  window.ShareSphereDB.update('donations', donation.id, {
    requestsCount: (donation.requestsCount || 0) + 1,
    status: 'Requested'
  });

  // Notify the donor
  window.ShareSphereDB.insert('notifications', {
    userId: donation.donorId,
    type: 'request',
    title: 'New Resource Request!',
    message: `${user.name} requested "${donation.title}". Review and accept the request.`,
    link: 'donations.html',
    isRead: false
  });

  // Celebration
  if (typeof confetti === 'function') {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
  }

  window.ShareSphereUtils.showToast('🤝 Request sent successfully! The donor will review it.', 'success');

  const modalEl = document.getElementById('requestModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  setTimeout(() => {
    window.location.href = 'requests.html';
  }, 1000);
}

/**
 * Render My Requests Dashboard
 */
function renderMyRequests() {
  const container = document.getElementById('my-requests-list');
  if (!container) return;

  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  const requests = window.ShareSphereDB.getCollection('requests').filter(r => r.requesterId === user.id);

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-box">
          <span class="empty-state-icon">🤝</span>
          <h4 class="empty-state-title">No requests made yet</h4>
          <p class="empty-state-text">Discover available resources in your community and request what you need.</p>
          <a href="explore.html" class="btn btn-primary-custom">
            <i class="bi bi-compass"></i> Explore Resources
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map(req => {
    const timelineHtml = generateTimelineHtml(req.status);
    return `
      <div class="col-12 mb-4">
        <div class="card border-0 shadow-sm rounded-4 p-4 bg-white">
          <div class="row align-items-center mb-3">
            <div class="col-md-7 d-flex align-items-center gap-3">
              <img src="${req.donationImage}" class="rounded-3" style="width: 72px; height: 72px; object-fit: cover;">
              <div>
                <span class="badge ${getStatusBadgeClass(req.status)} mb-1">${req.status}</span>
                <h5 class="fw-bold mb-1 text-dark">${req.donationTitle}</h5>
                <div class="small text-muted">
                  Donor: <b>${req.donorName}</b> • Qty: <b>${req.quantity}</b> • Requested ${window.ShareSphereUtils.timeAgo(req.createdAt)}
                </div>
              </div>
            </div>
            <div class="col-md-5 text-md-end mt-3 mt-md-0 d-flex gap-2 justify-content-md-end flex-wrap">
              <button class="btn btn-sm btn-outline-primary" onclick="window.ShareSphereChat.openChat('${req.id}', '${req.donorName}')">
                <i class="bi bi-chat-dots-fill"></i> Chat with Donor
              </button>
              ${req.status === 'Accepted' ? `
                <button class="btn btn-sm btn-primary-custom" onclick="openPickupCoordinationModal('${req.id}')">
                  <i class="bi bi-calendar-check"></i> Coordinate Pickup
                </button>
              ` : ''}
              ${req.status === 'Reserved' || req.status === 'Pickup Scheduled' ? `
                <button class="btn btn-sm btn-success" onclick="markRequestCompleted('${req.id}')">
                  <i class="bi bi-check2-circle"></i> Mark Completed
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Interactive Request Status Timeline -->
          <div class="p-3 rounded-4 bg-light">
            ${timelineHtml}
            ${req.pickupDate ? `
              <div class="mt-3 p-2 px-3 bg-white rounded-3 border d-flex align-items-center justify-content-between small">
                <div><i class="bi bi-geo-alt-fill text-danger"></i> <b>Pickup Location:</b> ${req.pickupLocation}</div>
                <div><i class="bi bi-clock-fill text-primary"></i> <b>Time:</b> ${req.pickupDate} at ${req.pickupTime}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getStatusBadgeClass(status) {
  if (status === 'Requested') return 'bg-warning text-dark';
  if (status === 'Accepted') return 'bg-primary text-white';
  if (status === 'Reserved' || status === 'Pickup Scheduled') return 'bg-info text-dark';
  if (status === 'Completed') return 'bg-success text-white';
  return 'bg-secondary text-white';
}

function generateTimelineHtml(currentStatus) {
  const steps = [
    { label: 'Requested', code: 1 },
    { label: 'Accepted', code: 2 },
    { label: 'Reserved', code: 3 },
    { label: 'Pickup Scheduled', code: 4 },
    { label: 'Completed', code: 5 }
  ];

  let currentCode = 1;
  if (currentStatus === 'Accepted') currentCode = 2;
  if (currentStatus === 'Reserved') currentCode = 3;
  if (currentStatus === 'Pickup Scheduled') currentCode = 4;
  if (currentStatus === 'Completed') currentCode = 5;

  return `
    <div class="request-timeline">
      ${steps.map(s => {
        let stateClass = '';
        if (s.code < currentCode) stateClass = 'completed';
        else if (s.code === currentCode) stateClass = 'current';

        return `
          <div class="timeline-step ${stateClass}">
            <div class="timeline-dot">
              ${s.code < currentCode ? '<i class="bi bi-check-lg"></i>' : s.code}
            </div>
            <span class="timeline-label">${s.label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Pickup Coordination Modal
 */
window.openPickupCoordinationModal = (requestId) => {
  const req = window.ShareSphereDB.findById('requests', requestId);
  if (!req) return;

  document.getElementById('pickup-req-id').value = requestId;
  document.getElementById('pickup-location-input').value = req.pickupLocation || '';
  
  const modal = new bootstrap.Modal(document.getElementById('pickupModal'));
  modal.show();
};

window.savePickupSchedule = () => {
  const reqId = document.getElementById('pickup-req-id').value;
  const date = document.getElementById('pickup-date-input').value;
  const time = document.getElementById('pickup-time-input').value;
  const loc = document.getElementById('pickup-location-input').value;

  if (!date || !time) {
    window.ShareSphereUtils.showToast('Please select both pickup date and time.', 'warning');
    return;
  }

  window.ShareSphereDB.update('requests', reqId, {
    status: 'Pickup Scheduled',
    pickupDate: date,
    pickupTime: time,
    pickupLocation: loc
  });

  const req = window.ShareSphereDB.findById('requests', reqId);
  if (req) {
    window.ShareSphereDB.insert('notifications', {
      userId: req.donorId,
      type: 'pickup',
      title: 'Pickup Scheduled! 📦',
      message: `${req.requesterName} scheduled pickup for ${date} at ${time}.`,
      link: 'donations.html',
      isRead: false
    });
  }

  window.ShareSphereUtils.showToast('Pickup Scheduled successfully!', 'success');
  
  const modalEl = document.getElementById('pickupModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();

  renderMyRequests();
};

/**
 * Mark Completed & Trigger Rating
 */
window.markRequestCompleted = (requestId) => {
  const req = window.ShareSphereDB.findById('requests', requestId);
  if (!req) return;

  window.ShareSphereDB.update('requests', requestId, { status: 'Completed' });
  window.ShareSphereDB.update('donations', req.donationId, { status: 'Completed' });

  // Award requester and donor points
  const user = window.ShareSphereAuth.getCurrentUser();
  const newPoints = (user.points || 0) + 100;
  window.ShareSphereDB.update('users', user.id, { points: newPoints });
  user.points = newPoints;
  window.ShareSphereAuth.setCurrentUser(user);

  // Notify donor of completion
  window.ShareSphereDB.insert('notifications', {
    userId: req.donorId,
    type: 'completed',
    title: 'Resource Shared Successfully! 🎉',
    message: `"${req.donationTitle}" has been marked as completed! You earned +100 Impact Points.`,
    link: 'donations.html',
    isRead: false
  });

  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  }

  window.ShareSphereUtils.showToast('🎉 Sharing marked as Completed! Thank you for promoting sustainability.', 'success');

  // Open review modal for rating the donor
  setTimeout(() => {
    openReviewModal(req.donorId, req.donorName, req.donationTitle);
  }, 800);

  renderMyRequests();
};

function openReviewModal(donorId, donorName, donationTitle) {
  const container = document.getElementById('review-modal-body');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-3">
      <div style="font-size: 3rem;">🌟</div>
      <h5 class="fw-bold">Rate your experience with ${donorName}</h5>
      <p class="small text-muted">Your review helps maintain safety, kindness, and trust in the ShareSphere community.</p>
      
      <div class="d-flex justify-content-center gap-2 my-3" id="rating-stars">
        ${[1, 2, 3, 4, 5].map(star => `
          <i class="bi bi-star-fill text-warning fs-3" style="cursor: pointer;" onclick="setRating(${star})" data-star="${star}"></i>
        `).join('')}
      </div>
      
      <textarea id="review-text-input" class="form-control rounded-3" rows="3" placeholder="Optional: Say something kind about ${donorName}..."></textarea>
      
      <button class="btn btn-primary-custom w-100 mt-3" onclick="submitReview('${donorId}')">
        Submit Rating & Review
      </button>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
  modal.show();
}

let activeRating = 5;
window.setRating = (val) => {
  activeRating = val;
  const stars = document.querySelectorAll('#rating-stars i');
  stars.forEach((s, idx) => {
    if (idx < val) {
      s.className = 'bi bi-star-fill text-warning fs-3';
    } else {
      s.className = 'bi bi-star text-muted fs-3';
    }
  });
};

window.submitReview = (donorId) => {
  const reviewText = document.getElementById('review-text-input')?.value.trim() || '';
  const user = window.ShareSphereAuth.getCurrentUser();

  window.ShareSphereDB.insert('reviews', {
    donorId,
    reviewerId: user.id,
    reviewerName: user.name,
    rating: activeRating,
    comment: reviewText
  });

  window.ShareSphereUtils.showToast('Thank you for rating your community peer!', 'success');
  const modalEl = document.getElementById('reviewModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
};
