/**
 * ShareSphere - Real-time Donor-Requester Coordination Chat
 */

window.ShareSphereChat = {
  activeRequestId: null,
  activePeerName: 'Community Peer',

  /**
   * Open chat window for a specific request
   */
  openChat(requestId, peerName) {
    this.activeRequestId = requestId;
    this.activePeerName = peerName || 'Community Peer';

    let modalEl = document.getElementById('chatModal');
    if (!modalEl) {
      this.createChatModal();
      modalEl = document.getElementById('chatModal');
    }

    document.getElementById('chat-peer-name').textContent = this.activePeerName;
    this.renderMessages();

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Auto-focus input
    setTimeout(() => {
      document.getElementById('chat-input')?.focus();
    }, 400);
  },

  createChatModal() {
    const div = document.createElement('div');
    div.className = 'modal fade';
    div.id = 'chatModal';
    div.tabIndex = -1;
    div.setAttribute('aria-hidden', 'true');

    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 overflow-hidden shadow-lg">
          <div class="chat-header">
            <div class="d-flex align-items-center gap-2">
              <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                <i class="bi bi-person-fill"></i>
              </div>
              <div>
                <h6 class="fw-bold mb-0" id="chat-peer-name">Community Peer</h6>
                <small class="text-success" style="font-size: 0.72rem;">● Active in Community</small>
              </div>
            </div>
            <button type="button" class="btn-close" data-bs-toggle="modal" data-bs-target="#chatModal"></button>
          </div>
          
          <div class="chat-messages" id="chat-messages-container">
            <!-- Messages render here -->
          </div>

          <div class="chat-input-row">
            <input type="text" id="chat-input" class="form-control rounded-pill" placeholder="Type a message..." autocomplete="off">
            <button class="btn btn-primary-custom rounded-pill" onclick="window.ShareSphereChat.sendMessage()">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);

    // Enter key listener
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.ShareSphereChat.sendMessage();
      }
    });
  },

  renderMessages() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const user = window.ShareSphereAuth.getCurrentUser();
    const allMessages = window.ShareSphereDB.getCollection('messages');
    let convo = allMessages.filter(m => m.requestId === this.activeRequestId);

    // If conversation is brand new, seed friendly greeting
    if (convo.length === 0) {
      const welcomeMsg = {
        requestId: this.activeRequestId,
        senderId: 'system',
        senderName: 'ShareSphere Safety Guide',
        text: '🤝 Coordination channel opened. Please agree on a safe, public pickup location and convenient timing.',
        createdAt: new Date().toISOString()
      };
      convo = [welcomeMsg];
    }

    container.innerHTML = convo.map(m => {
      if (m.senderId === 'system') {
        return `
          <div class="text-center my-2">
            <span class="badge bg-light text-muted border py-1 px-3" style="font-size: 0.72rem;">${m.text}</span>
          </div>
        `;
      }

      const isMe = m.senderId === user.id;
      return `
        <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
          <div>${m.text}</div>
          <span class="chat-time">${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (!text) return;

    const user = window.ShareSphereAuth.getCurrentUser();
    const newMsg = {
      requestId: this.activeRequestId,
      senderId: user.id,
      senderName: user.name,
      text: text,
      createdAt: new Date().toISOString()
    };

    window.ShareSphereDB.insert('messages', newMsg);
    input.value = '';
    this.renderMessages();

    // Friendly automated simulation if chatting with a demo user
    setTimeout(() => {
      this.simulateReply();
    }, 1500);
  },

  simulateReply() {
    const replies = [
      "Sounds great! That pickup timing works perfectly for me.",
      "Thank you so much! Looking forward to coordinating the handover.",
      "I will bring it cleanly packaged. See you near the community landmark!",
      "Perfect! Happy to share with someone who needs it."
    ];
    const replyText = replies[Math.floor(Math.random() * replies.length)];

    const replyMsg = {
      requestId: this.activeRequestId,
      senderId: 'peer_' + Date.now(),
      senderName: this.activePeerName,
      text: replyText,
      createdAt: new Date().toISOString()
    };

    window.ShareSphereDB.insert('messages', replyMsg);
    this.renderMessages();
  }
};
