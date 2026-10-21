// OTRO - Main Application Controller
const App = {
  activeTab: 'feed', // 'feed' | 'pros' | 'my-tasks'
  activeCategory: 'all',
  searchQuery: '',
  currentViewingTaskId: null,
  currentBiddingTaskId: null,

  init() {
    this.bindEvents();
    this.renderAll();
  },

  bindEvents() {
    // Role switchers
    document.querySelectorAll('[data-role-switch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.roleSwitch;
        Storage.setRole(role);
      });
    });

    window.addEventListener('roleChanged', (e) => {
      this.updateRoleUI(e.detail.role);
      this.renderCurrentTab();
    });

    // Tab buttons (desktop & mobile)
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (searchClear) {
          if (this.searchQuery) {
            searchClear.classList.add('visible');
          } else {
            searchClear.classList.remove('visible');
          }
        }
        this.renderCurrentTab();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.classList.remove('visible');
        this.renderCurrentTab();
        if (window.innerWidth > 768) {
          searchInput.focus();
        }
      });
    }

    // Publish Task Button
    const openPublishModalBtns = document.querySelectorAll('[data-open-publish]');
    openPublishModalBtns.forEach(btn => {
      btn.addEventListener('click', () => this.openPublishModal());
    });

    // Close Modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal-overlay');
        if (modal) this.closeModal(modal);
      });
    });

    // Close modal on background click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay);
        }
      });
    });

    // Form: New Task Submit
    const newTaskForm = document.getElementById('new-task-form');
    if (newTaskForm) {
      newTaskForm.addEventListener('submit', (e) => this.handleNewTaskSubmit(e));
    }

    // Form: Submit Bid Form
    const submitBidForm = document.getElementById('submit-bid-form');
    if (submitBidForm) {
      submitBidForm.addEventListener('submit', (e) => this.handleSubmitBid(e));
    }

    // Chat Form Submit
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-message-input');
        if (input && input.value) {
          ChatEngine.sendUserMessage(input.value);
          input.value = '';
        }
      });
    }

    // Chat Close Button
    const chatCloseBtn = document.getElementById('chat-close-btn');
    if (chatCloseBtn) {
      chatCloseBtn.addEventListener('click', () => ChatEngine.closeChat());
    }

    // Listen to task updates from Storage
    window.addEventListener('tasksUpdated', () => {
      this.renderCurrentTab();
      this.updateCounts();
      if (this.currentViewingTaskId) {
        this.refreshTaskDetailModal(this.currentViewingTaskId);
      }
    });
  },

  renderAll() {
    this.updateRoleUI(Storage.getRole());
    this.renderCategoriesNav();
    this.populateCategoryDropdown();
    this.updateCounts();
    this.renderCurrentTab();
  },

  updateRoleUI(role) {
    // Header buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
      if (btn.dataset.roleSwitch === role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Role callout message
    const calloutContainer = document.getElementById('role-callout-banner');
    if (calloutContainer) {
      if (role === 'client') {
        calloutContainer.innerHTML = `
          <div class="role-callout-text">
            <span>👤</span>
            <div>Estás navegando en <strong>Modo Cliente</strong>: Podés publicar necesidades para tu hogar y comparar ofertas de prestadores.</div>
          </div>
          <span class="role-switch-link" data-role-switch="provider">Cambiar a Soy un "Otro" ➜</span>
        `;
      } else {
        calloutContainer.innerHTML = `
          <div class="role-callout-text">
            <span>🧰</span>
            <div>Estás navegando en <strong>Modo Prestador ("Soy un Otro")</strong>: Explorá pedidos activos y enviá tus presupuestos para conseguir nuevos trabajos.</div>
          </div>
          <span class="role-switch-link" data-role-switch="client">Cambiar a Modo Cliente ➜</span>
        `;
      }

      // Re-bind click for newly rendered link
      const link = calloutContainer.querySelector('.role-switch-link');
      if (link) {
        link.addEventListener('click', (e) => {
          Storage.setRole(e.currentTarget.dataset.roleSwitch);
        });
      }
    }
  },

  renderCategoriesNav() {
    const container = document.getElementById('categories-nav');
    if (!container) return;

    const categories = INITIAL_DATA.categories;
    const tasks = Storage.getTasks();

    container.innerHTML = categories.map(cat => {
      let count = cat.count;
      if (cat.id !== 'all') {
        count = tasks.filter(t => t.category === cat.id && t.status === 'open').length;
      } else {
        count = tasks.filter(t => t.status === 'open').length;
      }

      const isActive = this.activeCategory === cat.id ? 'active' : '';
      return `
        <button class="category-chip ${isActive}" data-category="${cat.id}">
          <span class="chip-icon">${cat.icon}</span>
          <span class="chip-name">${cat.name}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.dataset.category;
        this.renderCategoriesNav();
        this.renderCurrentTab();
      });
    });
  },

  populateCategoryDropdown() {
    const select = document.getElementById('task-category-select');
    if (!select) return;

    const categories = INITIAL_DATA.categories.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.icon} ${c.name}</option>
    `).join('');
  },

  switchTab(tab) {
    this.activeTab = tab;

    // Update tab bar buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.renderCurrentTab();
  },

  renderCurrentTab() {
    const feedSection = document.getElementById('tasks-feed-section');
    const prosSection = document.getElementById('pros-directory-section');
    const myTasksSection = document.getElementById('my-tasks-section');

    if (feedSection) feedSection.style.display = this.activeTab === 'feed' ? 'block' : 'none';
    if (prosSection) prosSection.style.display = this.activeTab === 'pros' ? 'block' : 'none';
    if (myTasksSection) myTasksSection.style.display = this.activeTab === 'my-tasks' ? 'block' : 'none';

    if (this.activeTab === 'feed') {
      this.renderTasksFeed();
    } else if (this.activeTab === 'pros') {
      this.renderProsDirectory();
    } else if (this.activeTab === 'my-tasks') {
      this.renderMyTasks();
    }
  },

  updateCounts() {
    const tasks = Storage.getTasks();
    const openTasks = tasks.filter(t => t.status === 'open').length;
    const userTasks = tasks.filter(t => t.clientName === 'Facundo M.').length;

    const feedBadge = document.getElementById('tab-feed-badge');
    const myTasksBadge = document.getElementById('tab-my-tasks-badge');

    if (feedBadge) feedBadge.textContent = openTasks;
    if (myTasksBadge) myTasksBadge.textContent = userTasks;
  },

  /* -------------------------------------------------------------
     TASKS FEED
     ------------------------------------------------------------- */
  renderTasksFeed() {
    const container = document.getElementById('tasks-feed-grid');
    if (!container) return;

    let tasks = Storage.getTasks();
    const role = Storage.getRole();

    // Filter by Category
    if (this.activeCategory !== 'all') {
      tasks = tasks.filter(t => t.category === this.activeCategory);
    }

    // Filter by Search Query
    if (this.searchQuery) {
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(this.searchQuery) ||
        t.description.toLowerCase().includes(this.searchQuery) ||
        t.location.toLowerCase().includes(this.searchQuery)
      );
    }

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🔍</div>
          <h3>No se encontraron pedidos con este filtro</h3>
          <p>Probá cambiando de rubro o limpiando la búsqueda.</p>
          <button class="btn-primary" data-open-publish style="margin-top: 8px;">
            <span>➕</span> Publicar nueva necesidad
          </button>
        </div>
      `;
      const btn = container.querySelector('[data-open-publish]');
      if (btn) btn.addEventListener('click', () => this.openPublishModal());
      return;
    }

    container.innerHTML = tasks.map(task => {
      const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
      const bidsCount = (task.bids || []).length;
      const urgencyClass = task.urgencyLevel || 'medium';

      return `
        <div class="task-card" data-task-id="${task.id}">
          <div class="task-card-header">
            <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
            <span class="urgency-badge ${urgencyClass}">⏱️ ${task.urgency}</span>
          </div>

          <h3 class="task-card-title">${this.escapeHTML(task.title)}</h3>
          <p class="task-card-desc">${this.escapeHTML(task.description)}</p>

          <div class="task-meta-list">
            <div class="task-meta-row">
              <span>📍 Ubicación:</span>
              <strong>${this.escapeHTML(task.location)}</strong>
            </div>
            <div class="task-meta-row">
              <span>💰 Presupuesto estimado:</span>
              <strong class="task-budget-highlight">${this.escapeHTML(task.budget)}</strong>
            </div>
            <div class="task-meta-row">
              <span>👤 Solicitante:</span>
              <strong>${this.escapeHTML(task.clientName)} (${task.createdAt})</strong>
            </div>
          </div>

          <div class="task-card-footer">
            <div class="task-bids-count">
              <span>💬 ${bidsCount} ${bidsCount === 1 ? 'oferta' : 'ofertas'}</span>
            </div>

            ${role === 'provider' ? `
              <button class="task-action-btn bid" onclick="App.openBidModal('${task.id}')">
                ⚡ Postularme
              </button>
            ` : `
              <button class="task-action-btn view" onclick="App.openTaskDetailModal('${task.id}')">
                Ver Detalles / Ofertas ➜
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  /* -------------------------------------------------------------
     PROS DIRECTORY (LOS "OTROS")
     ------------------------------------------------------------- */
  renderProsDirectory() {
    const container = document.getElementById('pros-directory-grid');
    if (!container) return;

    let pros = Storage.getPros();

    // Filter by Category
    if (this.activeCategory !== 'all') {
      pros = pros.filter(p => p.category === this.activeCategory);
    }

    // Filter by Search Query
    if (this.searchQuery) {
      pros = pros.filter(p => 
        p.name.toLowerCase().includes(this.searchQuery) ||
        p.title.toLowerCase().includes(this.searchQuery) ||
        p.zone.toLowerCase().includes(this.searchQuery) ||
        (p.skills && p.skills.some(s => s.toLowerCase().includes(this.searchQuery)))
      );
    }

    if (pros.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">👥</div>
          <h3>No encontramos especialistas para este filtro</h3>
          <p>Probá seleccionando "Todos los Rubros" o una zona más amplia.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pros.map(pro => {
      const skillsHtml = (pro.skills || []).map(s => `<span class="skill-chip">${s}</span>`).join('');

      return `
        <div class="pro-card" data-pro-id="${pro.id}">
          <div class="pro-header-row">
            <div class="pro-avatar" style="background: ${pro.avatarColor}">
              ${pro.avatarInitials}
            </div>
            <div class="pro-info">
              <div class="pro-name-row">
                <span class="pro-name">${this.escapeHTML(pro.name)}</span>
                <span class="verified-badge-icon" title="Verificado con DNI y Antecedentes">✓</span>
              </div>
              <div class="pro-title-line">${this.escapeHTML(pro.title)}</div>
              <span class="pro-badge-tag">${pro.badge}</span>
            </div>
          </div>

          <div class="pro-stats-strip">
            <div class="pro-rating-stars">
              ★ ${pro.rating.toFixed(1)} <span class="pro-rating-count">(${pro.reviewsCount})</span>
            </div>
            <div class="pro-jobs-count">
              <strong>${pro.jobsCompleted}</strong> trabajos
            </div>
            <div class="pro-rate-tag">
              ${pro.hourlyRate}
            </div>
          </div>

          <p class="pro-bio-snippet">${this.escapeHTML(pro.bio)}</p>

          <div class="pro-skills-chips">
            ${skillsHtml}
          </div>

          <div class="pro-card-actions">
            <button class="btn-contact-wa" onclick="App.openProWhatsApp('${pro.id}')">
              <span>💬</span> WhatsApp
            </button>
            <button class="btn-chat-in-app" onclick="App.openProChat('${pro.id}')">
              <span>✉️</span> Chat OTRO
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /* -------------------------------------------------------------
     MY TASKS / ACTIVITY
     ------------------------------------------------------------- */
  renderMyTasks() {
    const container = document.getElementById('my-tasks-grid');
    if (!container) return;

    const tasks = Storage.getTasks();
    const myTasks = tasks.filter(t => t.clientName === 'Facundo M.');

    if (myTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">📋</div>
          <h3>Aún no has publicado pedidos para tu hogar</h3>
          <p>¿Se rompió una canilla? ¿Necesitás colgar un cuadro o pintar una pared? Publicá ahora y recibí presupuestos en minutos.</p>
          <button class="btn-primary" data-open-publish style="margin-top: 10px;">
            <span>➕</span> Publicar mi primer pedido
          </button>
        </div>
      `;
      const btn = container.querySelector('[data-open-publish]');
      if (btn) btn.addEventListener('click', () => this.openPublishModal());
      return;
    }

    container.innerHTML = myTasks.map(task => {
      const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
      const bids = task.bids || [];
      const hasAcceptedBid = bids.find(b => b.status === 'accepted');

      return `
        <div class="task-card" style="border-color: ${task.status === 'assigned' ? 'var(--color-success)' : 'var(--border-light)'}">
          <div class="task-card-header">
            <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
            <span class="urgency-badge ${task.status === 'assigned' ? 'low' : 'medium'}" style="${task.status === 'assigned' ? 'color: var(--color-success);' : ''}">
              ${task.status === 'assigned' ? '✅ En curso / Asignado' : '⏳ Recibiendo ofertas'}
            </span>
          </div>

          <h3 class="task-card-title">${this.escapeHTML(task.title)}</h3>
          <p class="task-card-desc">${this.escapeHTML(task.description)}</p>

          <div class="task-meta-list">
            <div class="task-meta-row">
              <span>📍 Zona:</span>
              <strong>${this.escapeHTML(task.location)}</strong>
            </div>
            <div class="task-meta-row">
              <span>💰 Tu presupuesto estimado:</span>
              <strong class="task-budget-highlight">${this.escapeHTML(task.budget)}</strong>
            </div>
            <div class="task-meta-row">
              <span>📬 Ofertas recibidas:</span>
              <strong style="color: var(--brand-primary);">${bids.length} profesionales se postularon</strong>
            </div>
          </div>

          <div class="task-card-footer">
            <button class="task-action-btn view" onclick="App.openTaskDetailModal('${task.id}')">
              ${bids.length > 0 ? `Ver ${bids.length} ofertas ➜` : 'Ver detalles'}
            </button>
            <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px; color: var(--color-danger);" onclick="App.deleteUserTask('${task.id}')">
              Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /* -------------------------------------------------------------
     TASK DETAIL & BIDS MODAL
     ------------------------------------------------------------- */
  openTaskDetailModal(taskId) {
    this.currentViewingTaskId = taskId;
    const task = Storage.getTaskById(taskId);
    if (!task) return;

    const modal = document.getElementById('task-detail-modal');
    if (!modal) return;

    this.refreshTaskDetailModal(taskId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  refreshTaskDetailModal(taskId) {
    const task = Storage.getTaskById(taskId);
    if (!task) return;

    const titleEl = document.getElementById('detail-modal-title');
    const bodyEl = document.getElementById('detail-modal-body');
    if (!titleEl || !bodyEl) return;

    const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
    titleEl.textContent = task.title;

    const bids = task.bids || [];
    let bidsHtml = '';

    if (bids.length === 0) {
      bidsHtml = `
        <div class="empty-state-card" style="padding: 20px;">
          <p>Aún no hay ofertas de profesionales para este pedido.</p>
          <span style="font-size: 0.8rem; color: var(--brand-primary);">Los prestadores verificados de la zona recibirán una notificación.</span>
        </div>
      `;
    } else {
      bidsHtml = bids.map(bid => {
        const isAccepted = bid.status === 'accepted';
        return `
          <div class="bid-item-card ${isAccepted ? 'accepted' : ''}">
            <div class="bid-item-header">
              <div class="bid-pro-info">
                <span class="bid-pro-name">👤 ${this.escapeHTML(bid.proName)}</span>
                <span style="color: var(--color-warning); font-size: 0.8rem;">★ ${bid.proRating}</span>
              </div>
              <div class="bid-amount">${this.escapeHTML(bid.amount)}</div>
            </div>

            <p class="bid-message">"${this.escapeHTML(bid.message)}"</p>
            <div style="font-size: 0.74rem; color: var(--text-subtle);">Enviado: ${bid.date}</div>

            <div class="bid-actions-row">
              ${isAccepted ? `
                <span style="color: var(--color-success); font-weight: 700; font-size: 0.85rem;">✅ Presupuesto Aceptado</span>
                <button class="btn-chat-in-app" onclick="App.openProChat('${bid.proId}', '${task.id}')">
                  Abrir Chat 💬
                </button>
              ` : `
                <button class="btn-secondary" style="font-size: 0.8rem;" onclick="App.openProChat('${bid.proId}', '${task.id}')">
                  Hacer una pregunta
                </button>
                <button class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="App.acceptBid('${task.id}', '${bid.id}')">
                  Aceptar Presupuesto
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    }

    bodyEl.innerHTML = `
      <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
          <span class="urgency-badge ${task.urgencyLevel || 'medium'}">⏱️ ${task.urgency}</span>
        </div>
        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-main); margin-bottom: 12px;">
          ${this.escapeHTML(task.description)}
        </p>
        <div style="font-size: 0.82rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div>📍 Zona: <strong>${this.escapeHTML(task.location)}</strong></div>
          <div>💰 Presupuesto estimado: <strong style="color: var(--color-success);">${this.escapeHTML(task.budget)}</strong></div>
        </div>
      </div>

      <div style="margin-top: 10px;">
        <h4 style="font-size: 1rem; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>Ofertas de prestadores ("Otros")</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${bids.length} recibidas</span>
        </h4>
        <div class="bids-list">
          ${bidsHtml}
        </div>
      </div>
    `;
  },

  acceptBid(taskId, bidId) {
    const updated = Storage.acceptBid(taskId, bidId);
    if (updated) {
      this.showToast('¡Presupuesto aceptado! Ya podés coordinar el trabajo.', '🎉');
      this.refreshTaskDetailModal(taskId);
      const acceptedBid = updated.bids.find(b => b.id === bidId);
      if (acceptedBid) {
        setTimeout(() => {
          this.openProChat(acceptedBid.proId, taskId);
        }, 800);
      }
    }
  },

  deleteUserTask(taskId) {
    if (confirm('¿Estás seguro de que querés eliminar este pedido?')) {
      Storage.deleteTask(taskId);
      this.showToast('Pedido eliminado correctamente.', '🗑️');
    }
  },

  /* -------------------------------------------------------------
     PUBLISH TASK MODAL
     ------------------------------------------------------------- */
  openPublishModal() {
    const modal = document.getElementById('publish-task-modal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const firstInput = document.getElementById('task-title-input');
    if (firstInput && window.innerWidth > 768) {
      firstInput.focus();
    }
  },

  handleNewTaskSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title-input').value.trim();
    const category = document.getElementById('task-category-select').value;
    const description = document.getElementById('task-desc-input').value.trim();
    const location = document.getElementById('task-location-input').value.trim();
    const budget = document.getElementById('task-budget-input').value.trim();
    const urgency = document.getElementById('task-urgency-select').value;

    if (!title || !description) return;

    let urgencyLevel = 'medium';
    if (urgency.toLowerCase().includes('hoy') || urgency.toLowerCase().includes('urgente')) {
      urgencyLevel = 'high';
    } else if (urgency.toLowerCase().includes('semana') || urgency.toLowerCase().includes('flexible')) {
      urgencyLevel = 'low';
    }

    Storage.createTask({
      title,
      category,
      description,
      location: location || 'CABA',
      budget: budget || 'A convenir',
      urgency,
      urgencyLevel,
      clientName: 'Facundo M.'
    });

    // Reset and close
    e.target.reset();
    this.closeModal(document.getElementById('publish-task-modal'));
    this.showToast('¡Tu pedido fue publicado! Los prestadores de tu zona te enviarán presupuestos.', '🚀');
    this.switchTab('my-tasks');
  },

  /* -------------------------------------------------------------
     SUBMIT BID MODAL (FOR PROVIDERS)
     ------------------------------------------------------------- */
  openBidModal(taskId) {
    this.currentBiddingTaskId = taskId;
    const task = Storage.getTaskById(taskId);
    if (!task) return;

    const modal = document.getElementById('submit-bid-modal');
    const taskTitleEl = document.getElementById('bid-target-task-title');
    if (taskTitleEl) taskTitleEl.textContent = task.title;

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('bid-amount-input');
      if (input && window.innerWidth > 768) {
        input.focus();
      }
    }
  },

  handleSubmitBid(e) {
    e.preventDefault();
    if (!this.currentBiddingTaskId) return;

    const amount = document.getElementById('bid-amount-input').value.trim();
    const message = document.getElementById('bid-message-input').value.trim();

    if (!amount || !message) return;

    Storage.addBidToTask(this.currentBiddingTaskId, {
      proId: 'pro-1',
      proName: 'Matías Benítez',
      proRating: 4.9,
      amount: '$' + amount.replace('$', ''),
      message
    });

    e.target.reset();
    this.closeModal(document.getElementById('submit-bid-modal'));
    this.showToast('¡Presupuesto enviado al cliente con éxito!', '✅');
  },

  /* -------------------------------------------------------------
     CONTACTING PROS (CHAT & WHATSAPP)
     ------------------------------------------------------------- */
  openProWhatsApp(proId) {
    const pro = Storage.getProById(proId);
    if (!pro) return;
    const phone = pro.phone ? pro.phone.replace(/[^0-9]/g, '') : '5491145678901';
    const text = pro.whatsappText || `Hola ${pro.name}, te contacto desde la app OTRO para consultar por un trabajo en mi hogar.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  },

  openProChat(proId, taskId = null) {
    const task = taskId ? Storage.getTaskById(taskId) : null;
    ChatEngine.openChat(proId, task);
  },

  closeModal(modalElement) {
    if (modalElement) {
      modalElement.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* -------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------- */
  showToast(message, icon = '✨') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
