/**
 * ShareSphere - Notification Center
 */

document.addEventListener('DOMContentLoaded', () => {
  renderNotificationsPage('all');

  const filterBtns = document.querySelectorAll('[data-notif-filter]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-notif-filter');
      renderNotificationsPage(filter);
    });
  });

  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllNotificationsAsRead);
  }
});

function renderNotificationsPage(filter) {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  const user = window.ShareSphereAuth.requireAuth();
  if (!user) return;

  const currentUid = String(user.uid || user.id);
  let notifs = window.ShareSphereDB.getCollection('notifications').filter(n => {
    if (!n) return false;
    const nUid = String(n.userId || '');
    return nUid === currentUid || (user.id && nUid === String(user.id)) || (user.uid && nUid === String(user.uid));
  });

  if (filter === 'unread') {
    notifs = notifs.filter(n => !n.isRead);
  }

  if (notifs.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <span class="empty-state-icon">🔔</span>
        <h4 class="empty-state-title">No notifications right now</h4>
        <p class="empty-state-text text-zinc-300">You're all caught up! New requests, acceptance notices, and nearby community alerts will show up here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifs.map(n => {
    let icon = 'bi-bell-fill text-primary';
    if (n.type === 'request') icon = 'bi-person-plus-fill text-warning';
    if (n.type === 'accepted') icon = 'bi-check-circle-fill text-success';
    if (n.type === 'pickup') icon = 'bi-calendar-event-fill text-info';
    if (n.type === 'completed') icon = 'bi-trophy-fill text-emerald';
    if (n.type === 'expiry') icon = 'bi-exclamation-triangle-fill text-danger';

    return `
      <div class="card border-0 shadow-sm rounded-4 p-3 mb-3 ${!n.isRead ? 'border-start border-4 border-success' : ''}" style="background: ${!n.isRead ? 'rgba(16, 185, 129, 0.12)' : 'rgba(18, 22, 36, 0.95)'}; border: 1px solid rgba(255, 255, 255, 0.12); transition: all 0.2s ease;">
        <div class="d-flex align-items-start gap-3">
          <div class="rounded-circle bg-dark border border-secondary shadow-sm d-flex align-items-center justify-content-center p-2" style="width: 44px; height: 44px; flex-shrink: 0;">
            <i class="bi ${icon} fs-5"></i>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="fw-bold mb-0 text-white">${n.title}</h6>
              <small class="text-zinc-300 font-medium">${window.ShareSphereUtils.timeAgo(n.createdAt)}</small>
            </div>
            <p class="small text-zinc-200 mb-2">${n.message}</p>
            <div class="d-flex gap-2">
              <a href="${n.link || '#'}" class="btn btn-sm btn-outline-primary" onclick="markNotificationRead('${n.id}')">
                View Details <i class="bi bi-arrow-right"></i>
              </a>
              ${!n.isRead ? `
                <button class="btn btn-sm btn-link text-zinc-300 text-decoration-none" onclick="markNotificationRead('${n.id}')">
                  Mark as read
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.markNotificationRead = (id) => {
  window.ShareSphereDB.update('notifications', id, { isRead: true });
  window.ShareSphereUtils.updateNavbarCounters();
  renderNotificationsPage('all');
};

function markAllNotificationsAsRead() {
  const user = window.ShareSphereAuth.getCurrentUser();
  if (!user) return;

  const notifs = window.ShareSphereDB.getCollection('notifications');
  const updated = notifs.map(n => n.userId === user.id ? { ...n, isRead: true } : n);
  window.ShareSphereDB.setCollection('notifications', updated);

  window.ShareSphereUtils.showToast('All notifications marked as read', 'info');
  window.ShareSphereUtils.updateNavbarCounters();
  renderNotificationsPage('all');
}
