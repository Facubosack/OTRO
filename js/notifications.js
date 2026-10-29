// OTRO - Realtime Notifications Engine & Web Push System
const Notifications = {
  list: [],
  _unsubscribe: null,
  _lastTimestamp: Date.now(),

  init() {
    this.bindEvents();

    // Listen to user auth changes
    window.addEventListener('userAuthChanged', (e) => {
      const user = e.detail?.user;
      if (user && user.uid) {
        this.subscribe(user.uid);
      } else {
        this.unsubscribe();
      }
    });

    // Check if user is already logged in
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.uid) {
      this.subscribe(Auth.currentUser.uid);
    }
  },

  bindEvents() {
    const notifBtn = document.getElementById('header-notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const markAllBtn = document.getElementById('notif-mark-all-btn');

    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllAsRead());
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (notifDropdown && !notifDropdown.contains(e.target) && notifBtn && !notifBtn.contains(e.target)) {
        notifDropdown.style.display = 'none';
      }
    });
  },

  toggleDropdown() {
    const notifDropdown = document.getElementById('notif-dropdown');
    if (!notifDropdown) return;

    const isVisible = notifDropdown.style.display === 'block';
    if (!isVisible) {
      notifDropdown.style.display = 'block';
      this.renderList();
      this.requestWebPushPermission();
    } else {
      notifDropdown.style.display = 'none';
    }
  },

  async requestWebPushPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log("🔔 Permiso de notificaciones del sistema concedido.");
          App.showToast('¡Notificaciones activadas en tu dispositivo!', '🔔');
        }
      } catch (err) {
        console.warn("No se pudo solicitar permiso de notificaciones:", err);
      }
    }
  },

  subscribe(uid) {
    if (this._unsubscribe) this._unsubscribe();
    if (typeof isFirebaseReady === 'undefined' || !isFirebaseReady || !db) return;

    try {
      console.log("🔔 Conectando listener de notificaciones en tiempo real para:", uid);
      this._lastTimestamp = Date.now();

      this._unsubscribe = db.collection('notifications')
        .where('userId', '==', uid)
        .onSnapshot((snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });

          // Sort descending (newest first)
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          // Check if any fresh notification arrived in real-time
          if (this.list.length > 0) {
            items.forEach(newItem => {
              if (newItem.createdAt > this._lastTimestamp && !newItem.read) {
                this.triggerSystemNotification(newItem);
              }
            });
          }

          this.list = items;
          this.updateBadge();
          this.renderList();
        }, (err) => {
          console.warn("Error en listener de notificaciones:", err);
        });
    } catch (err) {
      console.warn("No se pudo inicializar listener de notificaciones:", err);
    }
  },

  unsubscribe() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.list = [];
    this.updateBadge();
    this.renderList();
  },

  async createNotification(notif) {
    if (typeof isFirebaseReady === 'undefined' || !isFirebaseReady || !db) return;
    if (!notif.userId) return;

    try {
      const notifId = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const data = {
        id: notifId,
        userId: notif.userId,
        type: notif.type || 'info', // 'bid_received' | 'bid_accepted' | 'new_task' | 'info'
        title: notif.title || 'Aviso en OTRO',
        message: notif.message || '',
        taskId: notif.taskId || null,
        read: false,
        createdAt: Date.now()
      };

      await db.collection('notifications').doc(notifId).set(data);
      console.log("🔔 Notificación enviada a usuario:", notif.userId);
    } catch (err) {
      console.warn("No se pudo guardar notificación en Firestore:", err);
    }
  },

  async markAsRead(notifId) {
    const notif = this.list.find(n => n.id === notifId);
    if (notif && !notif.read) {
      notif.read = true;
      this.updateBadge();
      this.renderList();

      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        db.collection('notifications').doc(notifId).update({ read: true }).catch(() => {});
      }
    }
  },

  async markAllAsRead() {
    const unread = this.list.filter(n => !n.read);
    if (unread.length === 0) return;

    unread.forEach(n => n.read = true);
    this.updateBadge();
    this.renderList();

    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        const batch = db.batch();
        unread.forEach(n => {
          batch.update(db.collection('notifications').doc(n.id), { read: true });
        });
        await batch.commit();
      } catch (e) {
        console.warn("Error al marcar todas como leídas:", e);
      }
    }
  },

  updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    const unreadCount = this.list.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  renderList() {
    const container = document.getElementById('notif-dropdown-list');
    if (!container) return;

    if (this.list.length === 0) {
      container.innerHTML = `
        <div class="notif-empty-state">
          <span style="font-size: 1.8rem;">🔔</span>
          <p>No tenés notificaciones nuevas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.list.slice(0, 15).map(item => {
      const timeStr = this.formatTimeAgo(item.createdAt);
      let icon = '🔔';
      if (item.type === 'bid_received') icon = '📨';
      if (item.type === 'bid_accepted') icon = '🎉';
      if (item.type === 'new_task') icon = '⚡';

      return `
        <div class="notif-item ${item.read ? 'read' : 'unread'}" onclick="Notifications.handleItemClick('${item.id}', '${item.taskId || ''}')">
          <div class="notif-item-icon">${icon}</div>
          <div class="notif-item-content">
            <div class="notif-item-title">${this.escapeHTML(item.title)}</div>
            <div class="notif-item-msg">${this.escapeHTML(item.message)}</div>
            <div class="notif-item-time">${timeStr}</div>
          </div>
          ${!item.read ? '<span class="notif-unread-dot"></span>' : ''}
        </div>
      `;
    }).join('');
  },

  handleItemClick(notifId, taskId) {
    this.markAsRead(notifId);
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (taskId && typeof App !== 'undefined') {
      const task = Storage.getTaskById(taskId);
      if (task) {
        App.openTaskDetailModal(taskId);
      }
    }
  },

  triggerSystemNotification(notif) {
    // 1. In-app toast
    App.showToast(notif.message || notif.title, '🔔');

    // 2. Web Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title || 'OTRO', {
          body: notif.message,
          icon: './assets/logo.svg',
          badge: './assets/logo.svg'
        });
      } catch (err) {
        console.warn("No se pudo disparar notificación de sistema:", err);
      }
    }
  },

  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Recién';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Recién';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
  Notifications.init();
});
