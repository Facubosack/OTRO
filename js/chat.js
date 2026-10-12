// Chat Controller & Simulated Messaging Engine
const ChatEngine = {
  currentProId: null,
  activeTaskContext: null,

  openChat(proId, taskContext = null) {
    this.currentProId = proId;
    this.activeTaskContext = taskContext;

    const pro = Storage.getProById(proId) || {
      id: proId,
      name: 'Especialista OTRO',
      title: 'Prestador de Servicio',
      phone: '5491100000000',
      avatarColor: '#EA580C',
      avatarInitials: 'OT'
    };

    const modal = document.getElementById('chat-modal');
    if (!modal) return;

    // Set header info
    const headerTitle = document.getElementById('chat-pro-name');
    const headerSubtitle = document.getElementById('chat-pro-title');
    const headerAvatar = document.getElementById('chat-pro-avatar');
    const waBtn = document.getElementById('chat-whatsapp-btn');

    if (headerTitle) headerTitle.textContent = pro.name;
    if (headerSubtitle) headerSubtitle.textContent = pro.title || 'Prestador Verificado';
    if (headerAvatar) {
      headerAvatar.style.background = pro.avatarColor || '#EA580C';
      headerAvatar.textContent = pro.avatarInitials || pro.name.charAt(0);
    }

    // Set WhatsApp link
    if (waBtn) {
      let waText = pro.whatsappText || `Hola ${pro.name}, te contacto desde la app OTRO`;
      if (taskContext && taskContext.title) {
        waText = `Hola ${pro.name}! Te contacto por mi pedido en OTRO: "${taskContext.title}". ¿Podemos coordinar?`;
      }
      waBtn.onclick = () => {
        const phone = pro.phone ? pro.phone.replace(/[^0-9]/g, '') : '5491100000000';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`, '_blank');
      };
    }

    this.renderMessages();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
      const input = document.getElementById('chat-message-input');
      if (input) input.focus();
    }, 150);
  },

  closeChat() {
    const modal = document.getElementById('chat-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.currentProId = null;
    this.activeTaskContext = null;
  },

  renderMessages() {
    const container = document.getElementById('chat-messages-body');
    if (!container || !this.currentProId) return;

    const messages = Storage.getConversation(this.currentProId);
    
    if (messages.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <h4>Iniciá la conversación</h4>
          <p>Coordiná fecha, hacé preguntas o solicitá detalles del trabajo antes de contratar.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(m => `
      <div class="chat-bubble ${m.sender === 'user' ? 'outgoing' : 'incoming'}">
        <div class="bubble-content">${this.escapeHTML(m.text)}</div>
        <div class="bubble-time">${m.time}</div>
      </div>
    `).join('');
  },

  sendUserMessage(text) {
    if (!text || !text.trim() || !this.currentProId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Storage.addMessage(this.currentProId, {
      sender: 'user',
      text: text.trim(),
      time
    });

    this.renderMessages();
    this.scrollToBottom();

    // Trigger realistic simulated response after a short delay
    const pro = Storage.getProById(this.currentProId);
    const proName = pro ? pro.name.split(' ')[0] : 'El prestador';

    setTimeout(() => {
      this.simulateProReply(proName, text);
    }, 1300);
  },

  simulateProReply(proName, userQuery) {
    if (!this.currentProId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const queryLower = userQuery.toLowerCase();
    let reply = `¡Hola! Gracias por escribirme. Estuve viendo los detalles y cuento con las herramientas necesarias. ¿Para qué día y horario te quedaría mejor coordinar?`;

    if (queryLower.includes('precio') || queryLower.includes('cuanto') || queryLower.includes('costo') || queryLower.includes('presupuesto')) {
      reply = `El valor estimado incluye mano de obra y materiales estándar de fijación. Si surge algún repuesto específico te aviso antes de comprarlo para que tengas total transparencia.`;
    } else if (queryLower.includes('cuándo') || queryLower.includes('cuando') || queryLower.includes('hoy') || queryLower.includes('mañana')) {
      reply = `Tengo un espacio en la agenda hoy por la tarde y también mañana a primera hora. Si me pasás la dirección exacta ya lo agendo en el GPS.`;
    } else if (queryLower.includes('foto') || queryLower.includes('foto') || queryLower.includes('imagen')) {
      reply = `¡Buenísimo! Las fotos me ayudan muchísimo a llevar la medida justa de repuestos y no perder tiempo.`;
    } else if (queryLower.includes('gracias') || queryLower.includes('dale') || queryLower.includes('perfecto')) {
      reply = `¡De nada! Quedo 100% a disposición por cualquier duda. También podemos llamarnos o seguir por WhatsApp si te es más cómodo.`;
    }

    Storage.addMessage(this.currentProId, {
      sender: 'pro',
      text: reply,
      time
    });

    this.renderMessages();
    this.scrollToBottom();
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages-body');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

window.addEventListener('chatUpdated', (e) => {
  if (ChatEngine.currentProId && e.detail && e.detail.proId === ChatEngine.currentProId) {
    ChatEngine.renderMessages();
  }
});
