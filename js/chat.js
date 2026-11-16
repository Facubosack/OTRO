// OTRO - Real-Time Two-Way Chat Controller (Client <-> Provider via Firestore)
const ChatEngine = {
  currentRoomId: null,
  currentPeer: null, // { id, name, title, phone, photoURL, initials }
  activeTaskContext: null,
  _unsubscribeRoom: null,
  _messagesCache: [],

  getCurrentUser() {
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.uid) {
      return Auth.currentUser;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
      if (saved && saved.uid) return saved;
    } catch (e) {}
    return null;
  },

  buildRoomId(uidA, uidB) {
    return [String(uidA), String(uidB)].sort().join('__');
  },

  /**
   * Opens a 1-on-1 chat with another user (Provider or Client)
   * @param {Object|string} peerOrId - Peer object { id, name, title, phone, photoURL } or user/pro ID
   * @param {Object|null} taskContext - Optional task object for context
   */
  async openChat(peerOrId, taskContext = null) {
    const myUser = this.getCurrentUser();
    if (!myUser) {
      if (typeof Auth !== 'undefined') {
        Auth.openAuthModal('Iniciá sesión con Google para chatear con otros usuarios.');
      }
      return;
    }

    this.activeTaskContext = taskContext;

    // Resolve peer information
    let peer = null;
    if (typeof peerOrId === 'object' && peerOrId !== null) {
      peer = { ...peerOrId };
    } else {
      const targetId = String(peerOrId);
      // 1. Check if targetId is the task author (Client) when I am the Provider
      if (taskContext && taskContext.authorId && String(myUser.uid) !== String(taskContext.authorId) && (targetId === String(taskContext.authorId) || targetId === String(myUser.uid))) {
        peer = {
          id: taskContext.authorId,
          name: taskContext.clientName || 'Cliente',
          title: `Solicitante en ${taskContext.location || 'tu zona'}`,
          phone: taskContext.clientPhone || '',
          photoURL: taskContext.clientPhoto || ''
        };
      } else {
        // 2. Check if targetId matches a bid on the task
        const matchingBid = taskContext && taskContext.bids
          ? taskContext.bids.find(b => String(b.proId) === targetId)
          : null;
        const proFromDir = Storage.getProById(targetId);

        if (proFromDir) {
          peer = {
            id: proFromDir.id,
            name: proFromDir.name,
            title: proFromDir.title || 'Especialista en OTRO',
            phone: proFromDir.phone || '',
            photoURL: proFromDir.avatarPhoto || '',
            initials: proFromDir.avatarInitials
          };
        } else if (matchingBid) {
          peer = {
            id: matchingBid.proId,
            name: matchingBid.proName || 'Prestador',
            title: 'Prestador postulado',
            phone: matchingBid.phone || '',
            photoURL: matchingBid.proPhoto || ''
          };
        } else {
          peer = {
            id: targetId,
            name: 'Usuario OTRO',
            title: 'Vecino en OTRO',
            phone: '',
            photoURL: ''
          };
        }
      }
    }

    // Prevent opening a chat with oneself
    if (String(peer.id) === String(myUser.uid)) {
      // If there's a taskContext and I'm not the author, the peer should be the task's author (Client)
      if (taskContext && taskContext.authorId && String(taskContext.authorId) !== String(myUser.uid)) {
        peer = {
          id: taskContext.authorId,
          name: taskContext.clientName || 'Cliente',
          title: `Solicitante en ${taskContext.location || 'tu zona'}`,
          phone: taskContext.clientPhone || '',
          photoURL: taskContext.clientPhoto || ''
        };
      } else {
        App.showToast('Este es tu propio perfil.', 'ℹ️');
        return;
      }
    }

    // Try to enrich peer details from Firestore users/{peer.id} if name is generic or phone is missing
    if (typeof db !== 'undefined' && db && peer.id) {
      try {
        const docSnap = await db.collection('users').doc(String(peer.id)).get();
        if (docSnap.exists) {
          const uData = docSnap.data();
          peer.name = uData.name || peer.name;
          peer.phone = uData.phone || peer.phone;
          peer.photoURL = uData.photoURL || peer.photoURL;
          if (!peer.title || peer.title === 'Vecino en OTRO' || peer.title === 'Usuario OTRO') {
            peer.title = uData.role === 'provider' ? (uData.bio || 'Prestador en OTRO') : `Vecino de ${uData.zone || 'la zona'}`;
          }
        }
      } catch (e) {
        console.warn("No se pudo enriquecer datos del destinatario:", e);
      }
    }

    this.currentPeer = peer;
    this.currentRoomId = this.buildRoomId(myUser.uid, peer.id);

    const modal = document.getElementById('chat-modal');
    if (!modal) return;

    this.updateChatHeader(peer, taskContext);
    this.subscribeToRoom(this.currentRoomId);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      this.scrollToBottom();
      const input = document.getElementById('chat-message-input');
      if (input && window.innerWidth > 768) {
        input.focus();
      }
    }, 150);
  },

  updateChatHeader(peer, taskContext) {
    const headerTitle = document.getElementById('chat-pro-name');
    const headerSubtitle = document.getElementById('chat-pro-title');
    const headerAvatar = document.getElementById('chat-pro-avatar');
    const waBtn = document.getElementById('chat-whatsapp-btn');

    if (headerTitle) headerTitle.textContent = peer.name || 'Vecino';
    if (headerSubtitle) {
      if (taskContext && taskContext.title) {
        headerSubtitle.textContent = `📌 ${taskContext.title}`;
      } else {
        headerSubtitle.textContent = peer.title || 'Usuario Verificado';
      }
    }

    if (headerAvatar) {
      headerAvatar.style.background = '#EA580C';
      if (peer.photoURL) {
        headerAvatar.innerHTML = `<img src="${peer.photoURL}" alt="${this.escapeHTML(peer.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        const initials = peer.initials || (peer.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        headerAvatar.textContent = initials;
      }
    }

    if (waBtn) {
      const cleanPhone = peer.phone ? String(peer.phone).replace(/[^0-9]/g, '') : '';
      if (cleanPhone) {
        waBtn.style.display = 'inline-flex';
        waBtn.onclick = () => {
          let waText = `Hola ${peer.name}! Te escribo desde la app OTRO.`;
          if (taskContext && taskContext.title) {
            waText = `Hola ${peer.name}! Te contacto desde OTRO por el pedido: "${taskContext.title}".`;
          }
          const formattedPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(waText)}`, '_blank');
        };
      } else {
        waBtn.style.display = 'inline-flex';
        waBtn.onclick = () => {
          App.showToast(`${peer.name} aún no cargó su número de WhatsApp. Podés escribirle por este chat.`, '💬');
        };
      }
    }
  },

  subscribeToRoom(roomId) {
    if (this._unsubscribeRoom) {
      this._unsubscribeRoom();
      this._unsubscribeRoom = null;
    }

    // Load local fallback first
    this._messagesCache = Storage.getConversation(roomId) || [];
    this.renderMessages();

    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        this._unsubscribeRoom = db.collection('chats').doc(roomId).onSnapshot((docSnap) => {
          if (docSnap.exists) {
            const data = docSnap.data();
            const msgs = Array.isArray(data.messages) ? data.messages : [];
            this._messagesCache = msgs;

            // Save to local cache as well
            const allChats = Storage.getChats();
            allChats[roomId] = msgs;
            localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));

            this.renderMessages();
            this.scrollToBottom();
          } else {
            this._messagesCache = [];
            this.renderMessages();
          }
        }, (err) => {
          console.warn("Error en listener de chat en tiempo real:", err);
        });
      } catch (err) {
        console.warn("No se pudo conectar listener de chat:", err);
      }
    }
  },

  closeChat() {
    if (this._unsubscribeRoom) {
      this._unsubscribeRoom();
      this._unsubscribeRoom = null;
    }
    const modal = document.getElementById('chat-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentRoomId = null;
    this.currentPeer = null;
    this.activeTaskContext = null;
  },

  renderMessages() {
    const container = document.getElementById('chat-messages-body');
    if (!container || !this.currentRoomId) return;

    const myUser = this.getCurrentUser();
    const myUid = myUser ? String(myUser.uid) : '';
    const messages = this._messagesCache || [];

    if (messages.length === 0) {
      const peerName = this.currentPeer ? this.escapeHTML(this.currentPeer.name) : 'el usuario';
      container.innerHTML = `
        <div class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <h4>Chat directo con ${peerName}</h4>
          <p>Escribí un mensaje para coordinar detalles, horarios o dirección del trabajo.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(m => {
      const isMine = (m.senderId && String(m.senderId) === myUid) || (!m.senderId && m.sender === 'user');
      return `
        <div class="chat-bubble ${isMine ? 'outgoing' : 'incoming'}">
          ${!isMine && m.senderName ? `<div style="font-size: 0.7rem; font-weight: 700; color: var(--brand-primary); margin-bottom: 2px;">${this.escapeHTML(m.senderName)}</div>` : ''}
          <div class="bubble-content">${this.escapeHTML(m.text)}</div>
          <div class="bubble-time">${this.escapeHTML(m.time || '')}</div>
        </div>
      `;
    }).join('');
  },

  async sendUserMessage(text) {
    if (!text || !text.trim() || !this.currentRoomId || !this.currentPeer) return;

    const myUser = this.getCurrentUser();
    if (!myUser) return;

    const cleanText = text.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      senderId: myUser.uid,
      senderName: myUser.name || 'Vecino',
      recipientId: this.currentPeer.id,
      text: cleanText,
      time,
      createdAt: Date.now()
    };

    // Optimistic UI update
    this._messagesCache.push(newMsg);
    Storage.addMessage(this.currentRoomId, newMsg);
    this.renderMessages();
    this.scrollToBottom();

    // Sync to Firestore in real-time
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        const roomRef = db.collection('chats').doc(this.currentRoomId);
        await roomRef.set({
          roomId: this.currentRoomId,
          participants: [String(myUser.uid), String(this.currentPeer.id)],
          taskId: this.activeTaskContext ? this.activeTaskContext.id : null,
          taskTitle: this.activeTaskContext ? this.activeTaskContext.title : null,
          updatedAt: Date.now(),
          messages: this._messagesCache
        }, { merge: true });

        // Send real-time notification to the recipient
        if (typeof Notifications !== 'undefined' && this.currentPeer.id && String(this.currentPeer.id) !== String(myUser.uid)) {
          Notifications.createNotification({
            userId: String(this.currentPeer.id),
            type: 'new_message',
            title: `💬 Mensaje de ${myUser.name || 'un vecino'}`,
            message: cleanText.length > 70 ? cleanText.substring(0, 70) + '...' : cleanText,
            taskId: this.activeTaskContext ? this.activeTaskContext.id : null,
            senderId: String(myUser.uid),
            senderName: myUser.name || 'Vecino'
          });
        }
      } catch (err) {
        console.error("Error guardando mensaje en Firestore:", err);
      }
    }
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages-body');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
