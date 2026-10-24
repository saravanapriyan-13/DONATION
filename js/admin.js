/**
 * ShareSphere - Comprehensive Administrator Management Console
 */

let donationActivityChart = null;
let categoryChart = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = window.ShareSphereAuth.getCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }

  initAdminDashboard();
  setupAdminNavigation();
  setupAdminSearchAndFilters();
});

function initAdminDashboard() {
  renderAdminOverviewMetrics();
  renderAdminCharts();
  renderAdminUsersTable();
  renderAdminDonationsTable();
  renderAdminReportsTable();
}

function setupAdminNavigation() {
  const navLinks = document.querySelectorAll('.admin-sidebar .nav-link');
  const sections = document.querySelectorAll('.admin-section-pane');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const targetId = link.getAttribute('data-target-section');
      sections.forEach(sec => sec.style.display = 'none');

      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
    });
  });
}

function renderAdminOverviewMetrics() {
  const users = window.ShareSphereDB.getCollection('users');
  const donations = window.ShareSphereDB.getCollection('donations');
  const requests = window.ShareSphereDB.getCollection('requests');
  const reports = window.ShareSphereDB.getCollection('reports');

  const activeDonations = donations.filter(d => d.status === 'Available');
  const completedDonations = donations.filter(d => d.status === 'Completed');
  const pendingRequests = requests.filter(r => r.status === 'Requested');
  const pendingReports = reports.filter(r => r.status === 'Pending');

  document.getElementById('metric-total-users').textContent = users.length;
  document.getElementById('metric-total-donations').textContent = donations.length;
  document.getElementById('metric-active-donations').textContent = activeDonations.length;
  document.getElementById('metric-completed-donations').textContent = completedDonations.length;
  document.getElementById('metric-pending-requests').textContent = pendingRequests.length;
  document.getElementById('metric-pending-reports').textContent = pendingReports.length;
}

function renderAdminCharts() {
  if (typeof Chart === 'undefined') return;

  // Donation Activity & Growth Chart
  const ctxActivity = document.getElementById('chartDonationActivity');
  if (ctxActivity) {
    if (donationActivityChart) donationActivityChart.destroy();
    donationActivityChart = new Chart(ctxActivity, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [
          {
            label: 'Donations Listed',
            data: [35, 59, 80, 81, 126, 155, 190, 240, 310, 420],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Completed Shares',
            data: [20, 42, 60, 68, 98, 120, 155, 205, 260, 360],
            borderColor: '#2563EB',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Category Distribution Chart
  const ctxCategory = document.getElementById('chartCategoryDistribution');
  if (ctxCategory) {
    const donations = window.ShareSphereDB.getCollection('donations');
    const categories = ['Books', 'Food', 'Clothes', 'Electronics', 'Furniture', 'Toys', 'Other'];
    const counts = categories.map(cat => donations.filter(d => d.category === cat).length);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: counts,
          backgroundColor: [
            '#8B5CF6',
            '#F59E0B',
            '#4F46E5',
            '#2563EB',
            '#F97316',
            '#EC4899',
            '#10B981'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

/**
 * Admin User Management Table
 */
function renderAdminUsersTable(searchKeyword = '') {
  const container = document.getElementById('admin-users-tbody');
  if (!container) return;

  let users = window.ShareSphereDB.getCollection('users');
  if (searchKeyword) {
    const q = searchKeyword.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  container.innerHTML = users.map(u => {
    const isSuspended = u.status === 'Suspended';
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${u.avatar}" class="rounded-circle" style="width: 34px; height: 34px; object-fit: cover;">
            <div>
              <div class="fw-bold small text-dark">${u.name}</div>
              <div class="text-muted" style="font-size: 0.72rem;">${u.email}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${u.role === 'admin' ? 'bg-purple text-white' : 'bg-light text-dark border'}">${u.role}</span></td>
        <td><span class="badge ${isSuspended ? 'bg-danger' : 'bg-success'}">${u.status || 'Active'}</span></td>
        <td><i class="bi bi-star-fill text-warning"></i> ${(u.rating || 5.0).toFixed(1)}</td>
        <td>${u.donationsCount || 0}</td>
        <td>
          <button class="btn btn-sm ${isSuspended ? 'btn-outline-success' : 'btn-outline-warning'}" onclick="toggleUserSuspension('${u.id}')">
            ${isSuspended ? '<i class="bi bi-check-circle"></i> Activate' : '<i class="bi bi-slash-circle"></i> Suspend'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleUserSuspension = (userId) => {
  const user = window.ShareSphereDB.findById('users', userId);
  if (!user) return;

  const newStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
  window.ShareSphereDB.update('users', userId, { status: newStatus });
  window.ShareSphereUtils.showToast(`User status changed to ${newStatus}.`, 'info');
  renderAdminUsersTable();
  renderAdminOverviewMetrics();
};

/**
 * Admin Donation Management Table
 */
function renderAdminDonationsTable(keyword = '') {
  const container = document.getElementById('admin-donations-tbody');
  if (!container) return;

  let donations = window.ShareSphereDB.getCollection('donations');
  if (keyword) {
    const q = keyword.toLowerCase();
    donations = donations.filter(d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.donorName.toLowerCase().includes(q));
  }

  container.innerHTML = donations.map(d => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${(d.imageUrls && d.imageUrls[0]) || ''}" class="rounded-2" style="width: 42px; height: 36px; object-fit: cover;">
          <div class="fw-bold small text-dark text-truncate" style="max-width: 220px;" title="${d.title}">${d.title}</div>
        </div>
      </td>
      <td><span class="badge bg-light text-dark border">${d.category}</span></td>
      <td>${d.donorName}</td>
      <td><span class="badge ${d.status === 'Available' ? 'bg-success' : 'bg-secondary'}">${d.status}</span></td>
      <td><small class="text-muted">${window.ShareSphereUtils.timeAgo(d.createdAt)}</small></td>
      <td>
        <div class="d-flex gap-1">
          <a href="donation-details.html?id=${d.id}" target="_blank" class="btn btn-sm btn-outline-primary" title="View details">
            <i class="bi bi-box-arrow-up-right"></i>
          </a>
          <button class="btn btn-sm btn-outline-danger" onclick="adminDeleteDonation('${d.id}')" title="Remove content">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.adminDeleteDonation = (id) => {
  if (confirm('Are you sure you want to remove this donation as inappropriate content?')) {
    window.ShareSphereDB.delete('donations', id);
    window.ShareSphereUtils.showToast('Donation removed by Admin.', 'info');
    renderAdminDonationsTable();
    renderAdminOverviewMetrics();
  }
};

/**
 * Admin Report Management Table
 */
function renderAdminReportsTable() {
  const container = document.getElementById('admin-reports-tbody');
  if (!container) return;

  const reports = window.ShareSphereDB.getCollection('reports');

  if (reports.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No pending moderation reports. Good job!</td></tr>`;
    return;
  }

  container.innerHTML = reports.map(r => `
    <tr>
      <td><span class="badge bg-danger-subtle text-danger">${r.reason}</span></td>
      <td class="fw-bold small text-dark">${r.reportedTitle || 'Resource Item'}</td>
      <td>${r.reporterName || 'Community Member'}</td>
      <td><span class="badge ${r.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}">${r.status}</span></td>
      <td><small class="text-muted">${window.ShareSphereUtils.timeAgo(r.createdAt)}</small></td>
      <td>
        <div class="d-flex gap-1">
          ${r.status === 'Pending' ? `
            <button class="btn btn-sm btn-success" onclick="resolveAdminReport('${r.id}')">
              <i class="bi bi-check-lg"></i> Resolve
            </button>
            <button class="btn btn-sm btn-danger" onclick="removeReportedContent('${r.id}', '${r.reportedId}')">
              <i class="bi bi-trash"></i> Remove Item
            </button>
          ` : `
            <span class="text-success small fw-bold">✓ Resolved</span>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

window.resolveAdminReport = (reportId) => {
  window.ShareSphereDB.update('reports', reportId, { status: 'Resolved' });
  window.ShareSphereUtils.showToast('Report marked as Resolved.', 'success');
  renderAdminReportsTable();
  renderAdminOverviewMetrics();
};

window.removeReportedContent = (reportId, donationId) => {
  if (donationId) {
    window.ShareSphereDB.delete('donations', donationId);
  }
  window.ShareSphereDB.update('reports', reportId, { status: 'Resolved - Content Deleted' });
  window.ShareSphereUtils.showToast('Reported content removed from platform.', 'info');
  renderAdminReportsTable();
  renderAdminDonationsTable();
  renderAdminOverviewMetrics();
};

function setupAdminSearchAndFilters() {
  const userSearch = document.getElementById('admin-user-search');
  if (userSearch) {
    userSearch.addEventListener('input', (e) => renderAdminUsersTable(e.target.value));
  }

  const donSearch = document.getElementById('admin-donation-search');
  if (donSearch) {
    donSearch.addEventListener('input', (e) => renderAdminDonationsTable(e.target.value));
  }
}
