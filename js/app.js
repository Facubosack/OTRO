// OTRO - Main Application Controller
const App = {
  currentView: 'welcome', // 'welcome' | 'app'
  activeTab: 'feed', // 'feed' | 'pros' | 'my-tasks'
  activeCategory: 'all',
  clientStatusFilter: 'all', // 'all' | 'open' | 'assigned'
  searchQuery: '',
  sortByProximity: false,
  currentViewingTaskId: null,
  currentBiddingTaskId: null,

  init() {
    this.ensureHelpButton();
    this.initInitialView();
    this.bindEvents();
    this.renderAll();
  },

  ensureHelpButton() {
    // Remove old info button if still present in cached DOM
    const oldInfoBtn = document.getElementById('header-info-btn');
    if (oldInfoBtn) oldInfoBtn.remove();

    if (!document.getElementById('header-help-btn')) {
      const notifWrapper = document.querySelector('.header-notif-wrapper');
      if (notifWrapper && notifWrapper.parentNode) {
        const btn = document.createElement('button');
        btn.id = 'header-help-btn';
        btn.className = 'header-help-btn';
        btn.title = '¿Cómo funciona OTRO?';
        btn.innerHTML = '<span>?</span>';
        btn.addEventListener('click', () => this.toggleWelcomeView());
        notifWrapper.parentNode.insertBefore(btn, notifWrapper);
      }
    }
  },

  isUserLoggedIn() {
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.uid) {
      return true;
    }
    try {
      const savedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null');
      return !!(savedUser && savedUser.uid);
    } catch (e) {
      return false;
    }
  },

  initInitialView() {
    const hasSeenWelcome = localStorage.getItem('otro_welcome_seen') === 'true';
    if (this.isUserLoggedIn() || hasSeenWelcome) {
      this.enterApp('feed', null, false);
    } else {
      this.showWelcomeView(false);
    }
  },

  bindEvents() {
    // Role switchers
    document.querySelectorAll('[data-role-switch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.roleSwitch;
        Storage.setRole(role);
        if (this.currentView === 'welcome') {
          this.enterApp('feed');
        }
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
        if (this.currentView === 'welcome') {
          this.enterApp(tab);
        } else {
          this.switchTab(tab);
        }
      });
    });

    // Client Status Filter Pills (All / Open / Assigned)
    document.querySelectorAll('[data-client-filter]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        this.clientStatusFilter = e.currentTarget.dataset.clientFilter || 'all';
        document.querySelectorAll('[data-client-filter]').forEach(p => {
          p.classList.toggle('active', p.dataset.clientFilter === this.clientStatusFilter);
        });
        this.renderTasksFeed();
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

    // Listen to real-time cloud sync status
    window.addEventListener('cloudSyncState', (e) => {
      const badge = document.getElementById('cloud-sync-badge');
      if (badge) {
        if (e.detail && e.detail.connected) {
          badge.textContent = '🟢 EN VIVO';
          badge.classList.remove('offline');
          badge.title = 'Conectado a Firebase Firestore en tiempo real';
        } else {
          badge.textContent = '🟡 OFFLINE';
          badge.classList.add('offline');
          badge.title = 'Modo local sin conexión';
        }
      }
    });

    // Listen to Firebase cloud errors (such as missing permissions)
    window.addEventListener('cloudError', (e) => {
      if (e.detail && e.detail.message) {
        this.showToast(e.detail.message, '⚠️');
      }
    });

    // Listen to user authentication changes
    window.addEventListener('userAuthChanged', (e) => {
      const loggedInUser = e.detail && e.detail.user;
      if (loggedInUser) {
        // User is logged in: never show the welcome screen again
        localStorage.setItem('otro_welcome_seen', 'true');
        this.enterApp(this.activeTab || 'feed', null, false);
      }
      this.updateHeaderInfoButton();
      this.renderCurrentTab();
      this.updateCounts();
    });

    // Listen to real pros updates from Firestore
    window.addEventListener('prosUpdated', () => {
      if (this.activeTab === 'pros') {
        this.renderProsDirectory();
      }
    });

    // Proximity Sort Toggle Button
    const sortGeoBtn = document.getElementById('btn-toggle-sort-geo');
    if (sortGeoBtn) {
      sortGeoBtn.addEventListener('click', () => this.toggleProximitySort());
    }

    // Geolocation detection button in Publish Modal
    const detectPublishBtn = document.getElementById('btn-detect-location-publish');
    if (detectPublishBtn) {
      detectPublishBtn.addEventListener('click', () => this.detectLocationForForm('task'));
    }

    // Geolocation detection button in Profile Modal
    const detectProfileBtn = document.getElementById('btn-detect-location-profile');
    if (detectProfileBtn) {
      detectProfileBtn.addEventListener('click', () => this.detectLocationForForm('profile'));
    }

    // Attach location autocomplete to Task Publish input
    const taskLocInput = document.getElementById('task-location-input');
    if (taskLocInput && typeof Geo !== 'undefined') {
      Geo.attachAutocomplete(taskLocInput, (selected) => {
        const latInput = document.getElementById('task-lat-input');
        const lngInput = document.getElementById('task-lng-input');
        if (latInput) latInput.value = selected.lat;
        if (lngInput) lngInput.value = selected.lng;
        Geo.setUserCoords({ lat: selected.lat, lng: selected.lng, zone: selected.label });
      });
    }

    // Attach location autocomplete to Profile input
    const profileLocInput = document.getElementById('profile-zone-input');
    if (profileLocInput && typeof Geo !== 'undefined') {
      Geo.attachAutocomplete(profileLocInput, (selected) => {
        const latInput = document.getElementById('profile-lat-input');
        const lngInput = document.getElementById('profile-lng-input');
        if (latInput) latInput.value = selected.lat;
        if (lngInput) lngInput.value = selected.lng;
        Geo.setUserCoords({ lat: selected.lat, lng: selected.lng, zone: selected.label });
      });
    }

    // Listen to location updates
    window.addEventListener('userLocationUpdated', () => {
      this.renderCurrentTab();
    });
  },

  /* -------------------------------------------------------------
     NAVIGATION BETWEEN WELCOME PAGE & CLEAN MAIN APP VIEW
     ------------------------------------------------------------- */
  updateHeaderInfoButton() {
    const helpBtn = document.getElementById('header-help-btn');
    if (!helpBtn) return;

    if (this.currentView === 'welcome') {
      helpBtn.classList.add('active');
      helpBtn.title = 'Volver a la pantalla principal';
    } else {
      helpBtn.classList.remove('active');
      helpBtn.title = '¿Cómo funciona OTRO?';
    }
  },

  toggleWelcomeView() {
    if (this.currentView === 'welcome') {
      this.enterApp(this.activeTab || 'feed');
    } else {
      this.showWelcomeView(true, true);
    }
  },

  enterApp(tab = 'feed', role = null, scroll = true) {
    if (role) {
      Storage.setRole(role);
    }

    localStorage.setItem('otro_welcome_seen', 'true');
    this.currentView = 'app';

    const welcomeView = document.getElementById('welcome-view');
    const appMainView = document.getElementById('app-main-view');

    if (welcomeView) welcomeView.style.display = 'none';
    if (appMainView) appMainView.style.display = 'block';

    this.updateHeaderInfoButton();
    this.switchTab(tab);

    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  showWelcomeView(scroll = true, force = false) {
    // Only skip automatically on startup if user is logged in and didn't click '?'
    if (!force && this.isUserLoggedIn()) {
      this.enterApp('feed', null, false);
      return;
    }

    this.currentView = 'welcome';
    const welcomeView = document.getElementById('welcome-view');
    const appMainView = document.getElementById('app-main-view');

    if (welcomeView) welcomeView.style.display = 'block';
    if (appMainView) appMainView.style.display = 'none';

    this.updateHeaderInfoButton();

    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  renderAll() {
    this.updateRoleUI(Storage.getRole());
    this.renderCategoriesNav();
    this.populateCategoryDropdown();
    this.updateCounts();
    this.renderCurrentTab();
  },

  updateRoleUI(role) {
    // Remove any legacy role switchers/callouts if still present in DOM
    document.querySelectorAll('.role-toggle-group, #role-callout-banner').forEach(el => {
      el.style.display = 'none';
    });

    const isProvider = role === 'provider';

    const headerPublishBtn = document.getElementById('header-publish-btn');
    const mobilePublishBtn = document.getElementById('mobile-publish-btn');
    const myTasksPublishBtn = document.getElementById('my-tasks-publish-btn');
    const searchInput = document.getElementById('search-input');

    const tabLabelFeed = document.getElementById('tab-label-feed');
    const mobileTabLabelFeed = document.getElementById('mobile-tab-label-feed');
    const tabBtnMyTasks = document.getElementById('tab-btn-my-tasks');
    const mobileTabBtnMyTasks = document.getElementById('mobile-tab-btn-my-tasks');
    const tabLabelMyTasks = document.getElementById('tab-label-my-tasks');
    const mobileTabLabelMyTasks = document.getElementById('mobile-tab-label-my-tasks');
    const feedSectionTitle = document.getElementById('feed-section-title');
    const myTasksSectionTitle = document.getElementById('my-tasks-section-title');
    const sortGeoBtn = document.getElementById('btn-toggle-sort-geo');

    if (isProvider) {
      if (headerPublishBtn) headerPublishBtn.style.display = 'none';
      if (mobilePublishBtn) mobilePublishBtn.style.display = 'none';
      if (myTasksPublishBtn) myTasksPublishBtn.style.display = 'none';
      if (tabBtnMyTasks) tabBtnMyTasks.style.display = '';
      if (mobileTabBtnMyTasks) mobileTabBtnMyTasks.style.display = '';
      if (sortGeoBtn) sortGeoBtn.style.display = '';
      if (searchInput) {
        searchInput.placeholder = 'Buscar trabajos disponibles por rubro, tarea o barrio...';
      }
      if (tabLabelFeed) tabLabelFeed.textContent = 'Trabajos Disponibles';
      if (mobileTabLabelFeed) mobileTabLabelFeed.textContent = 'Trabajos';
      if (tabLabelMyTasks) tabLabelMyTasks.textContent = 'Mis Postulaciones';
      if (mobileTabLabelMyTasks) mobileTabLabelMyTasks.textContent = 'Postulaciones';
      if (feedSectionTitle) feedSectionTitle.innerHTML = '<span>🧰</span> Trabajos disponibles en tu zona';
      if (myTasksSectionTitle) myTasksSectionTitle.innerHTML = '<span>📌</span> Mis postulaciones y trabajos';
    } else {
      // Client Mode: main tab ('feed') IS their own orders ("Mis Pedidos")
      if (headerPublishBtn) headerPublishBtn.style.display = '';
      if (mobilePublishBtn) mobilePublishBtn.style.display = '';
      if (myTasksPublishBtn) myTasksPublishBtn.style.display = '';
      if (tabBtnMyTasks) tabBtnMyTasks.style.display = 'none';
      if (mobileTabBtnMyTasks) mobileTabBtnMyTasks.style.display = 'none';
      if (sortGeoBtn) sortGeoBtn.style.display = 'none';
      if (searchInput) {
        searchInput.placeholder = 'Buscar especialista por nombre, oficio o barrio...';
      }
      if (tabLabelFeed) tabLabelFeed.textContent = 'Mis Pedidos';
      if (mobileTabLabelFeed) mobileTabLabelFeed.textContent = 'Mis Pedidos';
      if (feedSectionTitle) feedSectionTitle.innerHTML = '<span>📌</span> Mis pedidos y servicios';

      if (this.activeTab === 'my-tasks') {
        this.activeTab = 'feed';
      }
    }

    this.updateCounts();
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
    const role = Storage.getRole();
    if (role !== 'provider' && tab === 'my-tasks') {
      tab = 'feed';
    }
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
    const searchFilterSection = document.getElementById('search-filter-section');
    const role = Storage.getRole();

    if (feedSection) feedSection.style.display = this.activeTab === 'feed' ? 'block' : 'none';
    if (prosSection) prosSection.style.display = this.activeTab === 'pros' ? 'block' : 'none';
    if (myTasksSection) myTasksSection.style.display = this.activeTab === 'my-tasks' ? 'block' : 'none';

    // Show search & category chips only on Pros Directory or Provider's Job Feed
    if (searchFilterSection) {
      const showSearch = this.activeTab === 'pros' || (role === 'provider' && this.activeTab === 'feed');
      searchFilterSection.style.display = showSearch ? 'flex' : 'none';
    }

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
    const role = Storage.getRole();
    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;

    let myClientTasksCount = 0;
    let myProviderBidsCount = 0;

    if (currentUser) {
      myClientTasksCount = tasks.filter(t => t.authorId === currentUser.uid || t.clientName === currentUser.name).length;
      myProviderBidsCount = tasks.filter(t => (t.bids || []).some(b => String(b.proId) === String(currentUser.uid))).length;
    }

    const feedBadge = document.getElementById('tab-feed-badge');
    const myTasksBadge = document.getElementById('tab-my-tasks-badge');

    if (role === 'provider') {
      if (feedBadge) feedBadge.textContent = openTasks;
      if (myTasksBadge) myTasksBadge.textContent = myProviderBidsCount;
    } else {
      if (feedBadge) feedBadge.textContent = myClientTasksCount;
      if (myTasksBadge) myTasksBadge.textContent = myClientTasksCount;
    }
  },

  /* -------------------------------------------------------------
     TASKS FEED (CLIENT: ONLY OWN ORDERS / PROVIDER: OPEN JOBS)
     ------------------------------------------------------------- */
  renderTasksFeed() {
    const container = document.getElementById('tasks-feed-grid');
    if (!container) return;

    const allTasks = Storage.getTasks();
    const role = Storage.getRole();
    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;

    const clientTopCtaBox = document.getElementById('client-top-cta-box');
    const feedHeaderRow = document.getElementById('feed-header-row');
    const clientStatusFilters = document.getElementById('client-status-filters');
    const sortGeoBtn = document.getElementById('btn-toggle-sort-geo');

    // =============================================================
    // VISTA CLIENTE: SOLO SUS PROPIOS PEDIDOS + BOTÓN GRANDE CTA
    // =============================================================
    if (role !== 'provider') {
      if (sortGeoBtn) sortGeoBtn.style.display = 'none';

      const myAllTasks = currentUser
        ? allTasks.filter(t => t.authorId === currentUser.uid || t.clientName === currentUser.name)
        : [];

      // Si el cliente aún no realizó ningún pedido: pantalla limpia con el botón grande protagonista
      if (myAllTasks.length === 0) {
        if (clientTopCtaBox) clientTopCtaBox.style.display = 'none';
        if (feedHeaderRow) feedHeaderRow.style.display = 'none';

        container.innerHTML = `
          <div class="client-hero-empty-card">
            <div class="client-hero-icon">🏡</div>
            <h2>¿Tenés algo para reparar o resolver en casa?</h2>
            <p>Publicá tu pedido en menos de un minuto, recibí presupuestos de especialistas de tu zona y coordiná por chat o WhatsApp.</p>
            <button class="btn-primary btn-client-giant-cta" data-open-publish>
              <span>✨</span> ¿Qué necesitás que haga OTRO en tu hogar?
            </button>
          </div>
        `;
        const btn = container.querySelector('[data-open-publish]');
        if (btn) btn.addEventListener('click', () => this.openPublishModal());
        return;
      }

      // Si el cliente YA tiene pedidos propios: mostramos el botón grande arriba + selector para distinguirlos
      if (clientTopCtaBox) {
        clientTopCtaBox.style.display = 'block';
        clientTopCtaBox.innerHTML = `
          <div class="client-top-cta-banner" onclick="App.openPublishModal()">
            <div class="client-top-cta-left">
              <span class="client-top-cta-icon">✨</span>
              <div>
                <strong>¿Qué necesitás que haga OTRO en tu hogar?</strong>
                <span>Tocá acá para publicar un nuevo pedido y recibir presupuestos</span>
              </div>
            </div>
            <button type="button" class="btn-primary">
              <span>➕</span> Nuevo pedido
            </button>
          </div>
        `;
      }

      if (feedHeaderRow) feedHeaderRow.style.display = 'flex';
      if (clientStatusFilters) {
        clientStatusFilters.style.display = 'flex';
        const openCount = myAllTasks.filter(t => t.status !== 'assigned').length;
        const assignedCount = myAllTasks.filter(t => t.status === 'assigned').length;

        const btnAll = clientStatusFilters.querySelector('[data-client-filter="all"]');
        const btnOpen = clientStatusFilters.querySelector('[data-client-filter="open"]');
        const btnAssigned = clientStatusFilters.querySelector('[data-client-filter="assigned"]');

        if (btnAll) btnAll.textContent = `Todos (${myAllTasks.length})`;
        if (btnOpen) btnOpen.textContent = `⏳ Recibiendo ofertas (${openCount})`;
        if (btnAssigned) btnAssigned.textContent = `✅ En curso (${assignedCount})`;
      }

      // Filtrar según lo que el cliente eligió ver
      let filteredMyTasks = myAllTasks;
      if (this.clientStatusFilter === 'open') {
        filteredMyTasks = myAllTasks.filter(t => t.status !== 'assigned');
      } else if (this.clientStatusFilter === 'assigned') {
        filteredMyTasks = myAllTasks.filter(t => t.status === 'assigned');
      }

      if (filteredMyTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card" style="padding: 36px 20px;">
            <div class="empty-state-icon">${this.clientStatusFilter === 'assigned' ? '✅' : '⏳'}</div>
            <h3 style="font-size: 1.1rem;">${this.clientStatusFilter === 'assigned' ? 'No tenés pedidos en curso en este momento' : 'No tenés pedidos pendientes de oferta'}</h3>
            <p style="font-size: 0.86rem;">Podés cambiar el filtro arriba para ver todos tus pedidos.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filteredMyTasks.map(task => {
        const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
        const bids = task.bids || [];
        const acceptedBid = bids.find(b => b.status === 'accepted');
        const isAssigned = task.status === 'assigned' || !!acceptedBid;

        return `
          <div class="task-card" style="border-color: ${isAssigned ? 'var(--color-success)' : 'var(--border-light)'}">
            <div class="task-card-header">
              <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
              <span class="urgency-badge ${isAssigned ? 'low' : 'medium'}" style="${isAssigned ? 'color: var(--color-success); font-weight: 700;' : ''}">
                ${isAssigned ? '✅ En curso / Asignado' : '⏳ Recibiendo ofertas'}
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
                <span>💰 Presupuesto estimado:</span>
                <strong class="task-budget-highlight">${this.escapeHTML(task.budget)}</strong>
              </div>
              <div class="task-meta-row">
                <span>${isAssigned ? '🧰 Prestador asignado:' : '📬 Ofertas recibidas:'}</span>
                <strong style="color: ${isAssigned ? 'var(--color-success)' : 'var(--brand-primary)'};">
                  ${isAssigned && acceptedBid
                    ? `${this.escapeHTML(acceptedBid.proName)} (${this.escapeHTML(acceptedBid.amount)})`
                    : `${bids.length} ${bids.length === 1 ? 'profesional se postuló' : 'profesionales se postularon'}`}
                </strong>
              </div>
            </div>

            <div class="task-card-footer">
              ${isAssigned && acceptedBid ? `
                <button class="task-action-btn view" onclick="App.openProChat('${acceptedBid.proId}', '${task.id}')">
                  💬 Chatear con ${this.escapeHTML((acceptedBid.proName || 'Prestador').split(' ')[0])}
                </button>
                <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="App.openTaskDetailModal('${task.id}')">
                  Ver detalle
                </button>
              ` : `
                <button class="task-action-btn view" onclick="App.openTaskDetailModal('${task.id}')">
                  ${bids.length > 0 ? `Ver ${bids.length} ${bids.length === 1 ? 'oferta' : 'ofertas'} ➜` : 'Ver detalles'}
                </button>
                <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px; color: var(--color-danger);" onclick="App.deleteUserTask('${task.id}')">
                  Eliminar
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // =============================================================
    // VISTA PRESTADOR ("OTRO"): TRABAJOS DISPONIBLES EN LA ZONA
    // =============================================================
    if (clientTopCtaBox) clientTopCtaBox.style.display = 'none';
    if (clientStatusFilters) clientStatusFilters.style.display = 'none';
    if (feedHeaderRow) feedHeaderRow.style.display = 'flex';
    if (sortGeoBtn) sortGeoBtn.style.display = '';

    let tasks = allTasks;

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
      const isFiltered = this.activeCategory !== 'all' || this.searchQuery;
      container.innerHTML = `
        <div class="empty-state-card" style="padding: 44px 20px;">
          <div class="empty-state-icon">${isFiltered ? '🔍' : '🧰'}</div>
          <h3 style="font-size: 1.15rem;">${isFiltered ? 'No se encontraron trabajos con este filtro' : 'No hay pedidos abiertos en este momento'}</h3>
          <p style="max-width: 440px; font-size: 0.88rem;">${isFiltered ? 'Probá seleccionando "Todos los Rubros" o limpiando el buscador.' : 'Apenas un vecino de tu zona publique un pedido en tu rubro, te avisaremos con una notificación.'}</p>
        </div>
      `;
      return;
    }

    // Proximity sorting if enabled
    const userCoords = (typeof Geo !== 'undefined') ? Geo.getUserCoords() : null;
    if (this.sortByProximity && userCoords) {
      tasks.sort((a, b) => {
        const distA = (a.lat && a.lng) ? Geo.calculateDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng) : 999999;
        const distB = (b.lat && b.lng) ? Geo.calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : 999999;
        return distA - distB;
      });
    }

    container.innerHTML = tasks.map(task => {
      const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
      const bidsCount = (task.bids || []).length;
      const urgencyClass = task.urgencyLevel || 'medium';

      let distanceBadgeHtml = '';
      if (userCoords && task.lat && task.lng && typeof Geo !== 'undefined') {
        const distKm = Geo.calculateDistanceKm(userCoords.lat, userCoords.lng, task.lat, task.lng);
        if (distKm !== null) {
          distanceBadgeHtml = `<span class="distance-badge" title="Distancia calculada en línea recta">📍 ${Geo.formatDistance(distKm)}</span>`;
        }
      }

      const myBid = currentUser && (task.bids || []).find(b => String(b.proId) === String(currentUser.uid));

      return `
        <div class="task-card" data-task-id="${task.id}">
          <div class="task-card-header">
            <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
            ${distanceBadgeHtml}
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

            ${myBid ? `
              <button class="task-action-btn view" onclick="App.openTaskDetailModal('${task.id}')">
                ${myBid.status === 'accepted' ? '🎉 Match · Chatear con Cliente' : '💬 Ver mi oferta / Chat'}
              </button>
            ` : `
              <div style="display: flex; gap: 6px;">
                <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 10px;" onclick="App.openTaskDetailModal('${task.id}')">
                  Ver
                </button>
                <button class="task-action-btn bid" onclick="App.openBidModal('${task.id}')">
                  ⚡ Postularme
                </button>
              </div>
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
      const isFiltered = this.activeCategory !== 'all' || this.searchQuery;
      container.innerHTML = `
        <div class="empty-state-card" style="padding: 44px 20px;">
          <div class="empty-state-icon">👥</div>
          <h3 style="font-size: 1.15rem;">${isFiltered ? 'No encontramos especialistas para este filtro' : 'Aún no hay prestadores registrados'}</h3>
          <p style="max-width: 440px; font-size: 0.88rem;">¿Hacés trabajos de oficio o reparaciones en tu zona? Podés sumarte como prestador desde tu Perfil ("Soy un Otro").</p>
          <button class="btn-primary" onclick="Auth.openProfileModal()" style="margin-top: 10px;">
            <span>🧰</span> Configurar mi Perfil de Prestador
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = pros.map(pro => {
      const skillsHtml = (pro.skills || []).map(s => `<span class="skill-chip">${this.escapeHTML(s)}</span>`).join('');
      const latestWork = (pro.completedWorks && pro.completedWorks.length > 0) ? pro.completedWorks[0] : null;
      const latestReview = (pro.reviews && pro.reviews.length > 0) ? pro.reviews[0] : null;

      return `
        <div class="pro-card" data-pro-id="${pro.id}">
          <div class="pro-header-row" onclick="App.openProProfileModal('${pro.id}')" style="cursor: pointer;">
            <div class="pro-avatar" style="background: ${pro.avatarColor}">
              ${pro.avatarPhoto ? `<img src="${pro.avatarPhoto}" alt="${this.escapeHTML(pro.name)}">` : pro.avatarInitials}
            </div>
            <div class="pro-info">
              <div class="pro-name-row">
                <span class="pro-name">${this.escapeHTML(pro.name)}</span>
                <span class="verified-badge-icon" title="Verificado en OTRO">✓</span>
              </div>
              <div class="pro-title-line">${this.escapeHTML(pro.title)}</div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 3px;">
                <span class="pro-badge-tag">${this.escapeHTML(pro.badge)}</span>
                <span style="font-size: 0.73rem; color: var(--text-muted);">📍 ${this.escapeHTML(pro.zone || 'CABA')}</span>
              </div>
            </div>
          </div>

          <div class="pro-stats-strip">
            <div class="pro-rating-stars">
              ★ ${pro.rating.toFixed(1)} <span class="pro-rating-count">(${pro.reviewsCount} reseñas)</span>
            </div>
            <div class="pro-jobs-count">
              🛠️ <strong>${pro.jobsCompleted}</strong> hechos
            </div>
            <div class="pro-rate-tag">
              ${this.escapeHTML(pro.hourlyRate)}
            </div>
          </div>

          <p class="pro-bio-snippet">${this.escapeHTML(pro.bio)}</p>

          <div class="pro-skills-chips">
            ${skillsHtml}
          </div>

          ${latestWork ? `
            <div class="pro-card-work-preview" onclick="App.openProProfileModal('${pro.id}')">
              <span class="work-preview-label">🛠️ Trabajo reciente:</span>
              <strong>${this.escapeHTML(latestWork.title)}</strong>
              <span class="work-preview-zone">(${this.escapeHTML(latestWork.zone)})</span>
            </div>
          ` : ''}

          ${latestReview ? `
            <div class="pro-card-review-preview" onclick="App.openProProfileModal('${pro.id}')">
              <div class="review-preview-quote">"${this.escapeHTML(latestReview.comment)}"</div>
              <div class="review-preview-author">
                <span>⭐ ${'★'.repeat(latestReview.rating || 5)}</span>
                <span>— <strong>${this.escapeHTML(latestReview.author)}</strong> (${this.escapeHTML(latestReview.zone)})</span>
              </div>
            </div>
          ` : ''}

          <div class="pro-card-actions">
            <button class="btn-secondary btn-view-pro-profile" onclick="App.openProProfileModal('${pro.id}')">
              <span>👁️</span> Ver Perfil y Trabajos
            </button>
            <button class="btn-chat-in-app" onclick="App.openProChat('${pro.id}')">
              <span>💬</span> Chat
            </button>
            <button class="btn-contact-wa" onclick="App.openProWhatsApp('${pro.id}')" title="Contactar por WhatsApp">
              <span>📲</span> WA
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  openProProfileModal(proId) {
    const pro = Storage.getProById(proId);
    if (!pro) return;

    const modal = document.getElementById('pro-profile-modal');
    const titleEl = document.getElementById('pro-modal-header-title');
    const bodyEl = document.getElementById('pro-profile-modal-body');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = `Perfil de ${pro.name}`;

    const skillsHtml = (pro.skills || []).map(s => `<span class="skill-chip">${this.escapeHTML(s)}</span>`).join('');
    const works = pro.completedWorks || [];
    const reviews = pro.reviews || [];

    const worksHtml = works.length > 0
      ? works.map(w => `
          <div class="pro-work-item">
            <div class="pro-work-item-top">
              <strong>✅ ${this.escapeHTML(w.title)}</strong>
              <span class="pro-work-meta">📍 ${this.escapeHTML(w.zone)} · ${this.escapeHTML(w.date || 'Finalizado')}</span>
            </div>
            <p>${this.escapeHTML(w.detail)}</p>
          </div>
        `).join('')
      : `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 10px 0;">Este especialista aún no cargó fotos o detalle de trabajos anteriores.</p>`;

    const reviewsHtml = reviews.length > 0
      ? reviews.map(r => `
          <div class="pro-review-item">
            <div class="pro-review-top">
              <div>
                <strong>👤 ${this.escapeHTML(r.author)}</strong>
                <span class="pro-review-zone">(${this.escapeHTML(r.zone)})</span>
              </div>
              <div class="pro-review-stars">
                ${'★'.repeat(Number(r.rating) || 5)} <span class="pro-review-date">${this.escapeHTML(r.date || '')}</span>
              </div>
            </div>
            <p class="pro-review-comment">"${this.escapeHTML(r.comment)}"</p>
          </div>
        `).join('')
      : `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 10px 0;">Sé el primero en dejar una recomendación para ${this.escapeHTML(pro.name)}.</p>`;

    bodyEl.innerHTML = `
      <div class="pro-modal-hero">
        <div class="pro-avatar pro-modal-avatar" style="background: ${pro.avatarColor}">
          ${pro.avatarPhoto ? `<img src="${pro.avatarPhoto}" alt="${this.escapeHTML(pro.name)}">` : pro.avatarInitials}
        </div>
        <div class="pro-modal-hero-info">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h3 style="font-size: 1.25rem;">${this.escapeHTML(pro.name)}</h3>
            <span class="pro-badge-tag">${this.escapeHTML(pro.badge)}</span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 600; color: var(--brand-primary); margin-top: 2px;">
            ${this.escapeHTML(pro.title)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            📍 Zonas de atención: <strong>${this.escapeHTML(pro.zone || 'CABA')}</strong>
          </div>
        </div>
      </div>

      <div class="pro-stats-strip" style="margin-bottom: 14px;">
        <div class="pro-rating-stars">
          ★ ${pro.rating.toFixed(1)} <span class="pro-rating-count">(${pro.reviewsCount} opiniones)</span>
        </div>
        <div class="pro-jobs-count">
          🛠️ <strong>${pro.jobsCompleted}</strong> trabajos realizados
        </div>
        <div class="pro-rate-tag">
          ${this.escapeHTML(pro.hourlyRate)}
        </div>
      </div>

      <p style="font-size: 0.9rem; color: var(--text-body); line-height: 1.55; margin-bottom: 12px;">
        ${this.escapeHTML(pro.bio)}
      </p>

      <div class="pro-skills-chips" style="margin-bottom: 18px;">
        ${skillsHtml}
      </div>

      <!-- SECCIÓN 1: TRABAJOS YA REALIZADOS -->
      <div class="pro-modal-section">
        <h4 class="pro-modal-section-title">
          <span>🛠️</span> Trabajos realizados recientemente (${works.length})
        </h4>
        <div class="pro-works-list">
          ${worksHtml}
        </div>
      </div>

      <!-- SECCIÓN 2: COMENTARIOS Y RECOMENDACIONES DE VECINOS -->
      <div class="pro-modal-section">
        <h4 class="pro-modal-section-title">
          <span>⭐</span> Comentarios de vecinos (${reviews.length})
        </h4>
        <div class="pro-reviews-list">
          ${reviewsHtml}
        </div>

        <!-- Formulario para agregar una recomendación real -->
        <form class="pro-add-review-form" onsubmit="App.handleAddProReview(event, '${pro.id}')">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--brand-dark); margin-bottom: 6px;">
            ✍️ ¿Ya trabajaste con ${this.escapeHTML(pro.name.split(' ')[0])}? Dejale tu comentario:
          </div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <select id="new-review-rating" class="form-select" style="width: 140px; padding: 7px 10px; font-size: 0.82rem;">
              <option value="5" selected>★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
            </select>
            <input type="text" id="new-review-comment" class="form-input" placeholder="Contá qué trabajo hizo y cómo resultó..." required style="flex: 1; padding: 7px 12px; font-size: 0.84rem;">
            <button type="submit" class="btn-primary" style="padding: 7px 14px; font-size: 0.8rem;">Publicar</button>
          </div>
        </form>
      </div>

      <!-- ACCIONES DE CONTACTO DIRECTO -->
      <div class="pro-modal-footer-actions">
        <button class="btn-chat-in-app" style="flex: 1; justify-content: center; padding: 11px 16px; font-size: 0.92rem;" onclick="App.closeModal(document.getElementById('pro-profile-modal')); App.openProChat('${pro.id}')">
          <span>💬</span> Chatear con ${this.escapeHTML(pro.name.split(' ')[0])}
        </button>
        <button class="btn-contact-wa" style="flex: 1; justify-content: center; padding: 11px 16px; font-size: 0.92rem;" onclick="App.openProWhatsApp('${pro.id}')">
          <span>📲</span> Contactar por WhatsApp
        </button>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  async handleAddProReview(e, proId) {
    e.preventDefault();
    const commentInput = document.getElementById('new-review-comment');
    const ratingSelect = document.getElementById('new-review-rating');
    if (!commentInput || !commentInput.value.trim()) return;

    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : Storage.getUser();

    await Storage.addProReview(proId, {
      author: currentUser.name || 'Vecino de OTRO',
      zone: currentUser.zone || 'CABA',
      rating: ratingSelect ? Number(ratingSelect.value) : 5,
      comment: commentInput.value.trim()
    });

    this.showToast('¡Gracias por dejar tu recomendación!', '⭐');
    this.openProProfileModal(proId);
    this.renderProsDirectory();
  },

  /* -------------------------------------------------------------
     MY TASKS / ACTIVITY
     ------------------------------------------------------------- */
  renderMyTasks() {
    const container = document.getElementById('my-tasks-grid');
    if (!container) return;

    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
    const role = Storage.getRole();

    if (!currentUser) {
      container.innerHTML = `
        <div class="empty-state-card" style="padding: 36px 20px;">
          <div class="empty-state-icon">🔒</div>
          <h3 style="font-size: 1.15rem;">Iniciá sesión para ver tu actividad</h3>
          <p style="max-width: 420px; font-size: 0.88rem;">Conectate con tu cuenta de Google para gestionar tus ${role === 'provider' ? 'postulaciones y clientes' : 'pedidos y presupuestos'} en tiempo real.</p>
          <button class="btn-primary" onclick="Auth.openAuthModal('Iniciá sesión para continuar')" style="margin-top: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            <span>Ingresar con Google</span>
          </button>
        </div>
      `;
      return;
    }

    const tasks = Storage.getTasks();

    // MODO PRESTADOR ("OTRO"): Mostrar las tareas a las que se postuló
    if (role === 'provider') {
      const myBidTasks = tasks.filter(t =>
        (t.bids || []).some(b => String(b.proId) === String(currentUser.uid))
      );

      if (myBidTasks.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-icon">🧰</div>
            <h3>Aún no te postulaste a ningún pedido</h3>
            <p>Explorá los trabajos disponibles en tu zona y pasá tu presupuesto para empezar a conectar con vecinos.</p>
            <button class="btn-primary" onclick="App.switchTab('feed')" style="margin-top: 10px;">
              <span>📋</span> Ver trabajos disponibles
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = myBidTasks.map(task => {
        const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
        const myBid = (task.bids || []).find(b => String(b.proId) === String(currentUser.uid));
        const isAccepted = myBid && myBid.status === 'accepted';
        const clientFirstName = (task.clientName || 'Cliente').split(' ')[0];

        return `
          <div class="task-card" style="border-color: ${isAccepted ? 'var(--color-success)' : 'var(--border-light)'}">
            <div class="task-card-header">
              <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
              <span class="urgency-badge ${isAccepted ? 'low' : 'medium'}" style="${isAccepted ? 'color: var(--color-success); font-weight: 700;' : ''}">
                ${isAccepted ? '🎉 ¡Presupuesto Aceptado!' : '⏳ Oferta enviada'}
              </span>
            </div>

            <h3 class="task-card-title">${this.escapeHTML(task.title)}</h3>
            <p class="task-card-desc">${this.escapeHTML(task.description)}</p>

            <div class="task-meta-list">
              <div class="task-meta-row">
                <span>👤 Cliente:</span>
                <strong>${this.escapeHTML(task.clientName)} (${this.escapeHTML(task.location)})</strong>
              </div>
              <div class="task-meta-row">
                <span>💰 Tu oferta enviada:</span>
                <strong class="task-budget-highlight">${this.escapeHTML(myBid ? myBid.amount : '')}</strong>
              </div>
            </div>

            <div class="task-card-footer">
              <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="App.openTaskDetailModal('${task.id}')">
                Ver pedido
              </button>
              <button class="task-action-btn view" onclick="App.openProChat('${task.authorId}', '${task.id}')">
                💬 Chatear con ${this.escapeHTML(clientFirstName)}
              </button>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // MODO CLIENTE: Mostrar sus pedidos publicados
    const myTasks = tasks.filter(t => 
      t.authorId === currentUser.uid ||
      t.clientName === currentUser.name ||
      (!t.authorId && (t.clientName === 'Facundo M.' || currentUser.name.includes('Facundo')))
    );

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
      const acceptedBid = bids.find(b => b.status === 'accepted');

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
              <strong style="color: var(--brand-primary);">${bids.length} ${bids.length === 1 ? 'profesional se postuló' : 'profesionales se postularon'}</strong>
            </div>
          </div>

          <div class="task-card-footer">
            ${acceptedBid ? `
              <button class="task-action-btn view" onclick="App.openProChat('${acceptedBid.proId}', '${task.id}')">
                💬 Chatear con ${this.escapeHTML((acceptedBid.proName || 'Prestador').split(' ')[0])}
              </button>
              <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="App.openTaskDetailModal('${task.id}')">
                Ver detalle
              </button>
            ` : `
              <button class="task-action-btn view" onclick="App.openTaskDetailModal('${task.id}')">
                ${bids.length > 0 ? `Ver ${bids.length} ofertas ➜` : 'Ver detalles'}
              </button>
              <button class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px; color: var(--color-danger);" onclick="App.deleteUserTask('${task.id}')">
                Eliminar
              </button>
            `}
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

    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;
    const isTaskOwner = !!(currentUser && (task.authorId === currentUser.uid || task.clientName === currentUser.name));
    const clientFirstName = (task.clientName || 'el cliente').split(' ')[0];

    const catObj = INITIAL_DATA.categories.find(c => c.id === task.category) || { name: 'Hogar', icon: '🏠' };
    titleEl.textContent = task.title;

    const bids = task.bids || [];
    let bidsHtml = '';

    if (bids.length === 0) {
      bidsHtml = `
        <div class="empty-state-card" style="padding: 20px;">
          <p>Aún no hay ofertas de profesionales para este pedido.</p>
          ${isTaskOwner ? `
            <span style="font-size: 0.8rem; color: var(--brand-primary);">Los prestadores verificados de la zona recibirán una notificación.</span>
          ` : `
            <button class="btn-primary" style="margin-top: 8px; font-size: 0.82rem;" onclick="App.closeModal(document.getElementById('task-detail-modal')); App.openBidModal('${task.id}')">
              ⚡ Enviar el primer presupuesto
            </button>
          `}
        </div>
      `;
    } else {
      bidsHtml = bids.map(bid => {
        const isAccepted = bid.status === 'accepted';
        const isMyBid = !!(currentUser && String(bid.proId) === String(currentUser.uid));
        const proFirstName = (bid.proName || 'Prestador').split(' ')[0];

        let actionsHtml = '';
        if (isTaskOwner) {
          // I am the Client: I chat with the Provider (bid.proId) and can accept their bid
          actionsHtml = isAccepted ? `
            <span style="color: var(--color-success); font-weight: 700; font-size: 0.85rem;">✅ Presupuesto Aceptado</span>
            <button class="btn-chat-in-app" onclick="App.openProChat('${bid.proId}', '${task.id}')">
              💬 Chatear con ${this.escapeHTML(proFirstName)}
            </button>
          ` : `
            <button class="btn-secondary" style="font-size: 0.8rem;" onclick="App.openProChat('${bid.proId}', '${task.id}')">
              💬 Chatear con ${this.escapeHTML(proFirstName)}
            </button>
            <button class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="App.acceptBid('${task.id}', '${bid.id}')">
              Aceptar Presupuesto
            </button>
          `;
        } else if (isMyBid) {
          // I am the Provider who sent this bid: I chat with the Client (task.authorId), NOT with myself!
          actionsHtml = isAccepted ? `
            <span style="color: var(--color-success); font-weight: 700; font-size: 0.85rem;">🎉 ¡El cliente aceptó tu oferta!</span>
            <button class="btn-chat-in-app" onclick="App.openProChat('${task.authorId}', '${task.id}')">
              💬 Chatear con ${this.escapeHTML(clientFirstName)}
            </button>
          ` : `
            <span style="color: var(--text-muted); font-size: 0.8rem;">⏳ Tu oferta fue enviada</span>
            <button class="btn-secondary" style="font-size: 0.8rem;" onclick="App.openProChat('${task.authorId}', '${task.id}')">
              💬 Chatear con ${this.escapeHTML(clientFirstName)}
            </button>
          `;
        } else {
          // Another user viewing this bid
          actionsHtml = isAccepted ? `
            <span style="color: var(--color-success); font-weight: 700; font-size: 0.82rem;">✅ Asignado</span>
          ` : '';
        }

        return `
          <div class="bid-item-card ${isAccepted ? 'accepted' : ''}">
            <div class="bid-item-header">
              <div class="bid-pro-info">
                <span class="bid-pro-name">🧰 ${this.escapeHTML(bid.proName)} ${isMyBid ? '<small style="color:var(--brand-primary);">(Vos)</small>' : ''}</span>
                <span style="color: var(--color-warning); font-size: 0.8rem;">★ ${bid.proRating}</span>
              </div>
              <div class="bid-amount">${this.escapeHTML(bid.amount)}</div>
            </div>

            <p class="bid-message">"${this.escapeHTML(bid.message)}"</p>
            <div style="font-size: 0.74rem; color: var(--text-subtle);">Enviado: ${bid.date}</div>

            <div class="bid-actions-row">
              ${actionsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    const hasMyBidAlready = !!(currentUser && bids.some(b => String(b.proId) === String(currentUser.uid)));

    bodyEl.innerHTML = `
      <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
          <span class="task-category-badge">${catObj.icon} ${catObj.name}</span>
          <span class="urgency-badge ${task.urgencyLevel || 'medium'}">⏱️ ${task.urgency}</span>
        </div>
        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-main); margin-bottom: 12px;">
          ${this.escapeHTML(task.description)}
        </p>
        <div style="font-size: 0.82rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <div>📍 Zona: <strong>${this.escapeHTML(task.location)}</strong></div>
          <div>💰 Presupuesto estimado: <strong style="color: var(--color-success);">${this.escapeHTML(task.budget)}</strong></div>
          <div>👤 Solicitante: <strong>${this.escapeHTML(task.clientName || 'Vecino')}</strong></div>
        </div>

        ${!isTaskOwner ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-light); display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
            <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="App.openProChat('${task.authorId}', '${task.id}')">
              💬 Consultar a ${this.escapeHTML(clientFirstName)}
            </button>
            ${!hasMyBidAlready && task.status === 'open' ? `
              <button class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px;" onclick="App.closeModal(document.getElementById('task-detail-modal')); App.openBidModal('${task.id}')">
                ⚡ Pasar presupuesto
              </button>
            ` : ''}
          </div>
        ` : ''}
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
    if (typeof Auth !== 'undefined' && !Auth.currentUser) {
      Auth.openAuthModal('Para publicar un pedido para tu hogar, primero iniciá sesión con Google.');
      return;
    }

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

    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : Storage.getUser();

    const latVal = document.getElementById('task-lat-input')?.value;
    const lngVal = document.getElementById('task-lng-input')?.value;
    const lat = latVal ? parseFloat(latVal) : (typeof Geo !== 'undefined' && Geo.getUserCoords()?.lat ? Geo.getUserCoords().lat : null);
    const lng = lngVal ? parseFloat(lngVal) : (typeof Geo !== 'undefined' && Geo.getUserCoords()?.lng ? Geo.getUserCoords().lng : null);

    Storage.createTask({
      title,
      category,
      description,
      location: location || currentUser.zone || 'CABA',
      lat,
      lng,
      budget: budget || 'A convenir',
      urgency,
      urgencyLevel,
      clientName: currentUser.name || 'Vecino',
      clientPhoto: currentUser.photoURL || '',
      authorId: currentUser.uid || 'demo-user',
      clientPhone: currentUser.phone || ''
    });

    // Reset and close
    e.target.reset();
    this.closeModal(document.getElementById('publish-task-modal'));

    // Clear filters so the new task is 100% visible at the top of the feed
    this.activeCategory = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const searchClear = document.getElementById('search-clear');
    if (searchClear) searchClear.classList.remove('visible');

    this.renderCategoriesNav();
    this.enterApp('feed');
    this.showToast('¡Tu pedido fue publicado y ya aparece primero en el muro!', '🚀');
  },

  /* -------------------------------------------------------------
     SUBMIT BID MODAL (FOR PROVIDERS)
     ------------------------------------------------------------- */
  openBidModal(taskId) {
    if (typeof Auth !== 'undefined' && !Auth.currentUser) {
      Auth.openAuthModal('Iniciá sesión con Google para enviar tu presupuesto.');
      return;
    }

    const task = Storage.getTaskById(taskId);
    if (!task) return;

    if (typeof Auth !== 'undefined' && Auth.currentUser && task.authorId === Auth.currentUser.uid) {
      this.showToast('Este pedido fue publicado por vos.', 'ℹ️');
      this.openTaskDetailModal(taskId);
      return;
    }

    this.currentBiddingTaskId = taskId;

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

    const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : Storage.getUser();

    Storage.addBidToTask(this.currentBiddingTaskId, {
      proId: currentUser.uid || 'pro-1',
      proName: currentUser.name || 'Prestador',
      proPhoto: currentUser.photoURL || '',
      proRating: 5.0,
      amount: '$' + amount.replace('$', ''),
      message,
      phone: currentUser.phone || ''
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
     GEOLOCATION HELPERS
     ------------------------------------------------------------- */
  async detectLocationForForm(type) {
    if (typeof Geo === 'undefined') return;

    const btn = document.getElementById(type === 'task' ? 'btn-detect-location-publish' : 'btn-detect-location-profile');
    const input = document.getElementById(type === 'task' ? 'task-location-input' : 'profile-zone-input');
    const latInput = document.getElementById(type === 'task' ? 'task-lat-input' : 'profile-lat-input');
    const lngInput = document.getElementById(type === 'task' ? 'task-lng-input' : 'profile-lng-input');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Detectando...';
    }

    try {
      const coords = await Geo.getCurrentPosition();
      const zoneName = await Geo.reverseGeocode(coords.lat, coords.lng);

      if (input) input.value = zoneName;
      if (latInput) latInput.value = coords.lat;
      if (lngInput) lngInput.value = coords.lng;

      Geo.setUserCoords({ lat: coords.lat, lng: coords.lng, zone: zoneName });
      this.showToast(`Ubicación detectada: ${zoneName}`, '📍');
    } catch (err) {
      console.error("Error al detectar ubicación:", err);
      this.showToast(err.message || 'No se pudo obtener la ubicación GPS.', '⚠️');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>📍</span> Mi ubicación';
      }
    }
  },

  async toggleProximitySort() {
    if (typeof Geo === 'undefined') return;
    const userCoords = Geo.getUserCoords();

    if (!this.sortByProximity && (!userCoords || !userCoords.lat)) {
      const btn = document.getElementById('btn-toggle-sort-geo');
      if (btn) btn.innerHTML = '<span>⏳</span> Buscando GPS...';
      try {
        const coords = await Geo.getCurrentPosition();
        const zoneName = await Geo.reverseGeocode(coords.lat, coords.lng);
        Geo.setUserCoords({ lat: coords.lat, lng: coords.lng, zone: zoneName });
        this.showToast(`Tu ubicación: ${zoneName}`, '📍');
      } catch (err) {
        this.showToast(err.message || 'Habilitá el GPS para ordenar por cercanía.', '⚠️');
        if (btn) btn.innerHTML = '<span id="sort-geo-icon">📍</span> <span id="sort-geo-text">Más cercanos</span>';
        return;
      }
    }

    this.sortByProximity = !this.sortByProximity;
    const sortBtn = document.getElementById('btn-toggle-sort-geo');
    if (sortBtn) {
      if (this.sortByProximity) {
        sortBtn.classList.add('active');
        sortBtn.innerHTML = '<span>⏱️</span> <span>Más recientes</span>';
        this.showToast('Mostrando pedidos más cercanos a tu ubicación', '📍');
      } else {
        sortBtn.classList.remove('active');
        sortBtn.innerHTML = '<span id="sort-geo-icon">📍</span> <span id="sort-geo-text">Más cercanos</span>';
      }
    }
    this.renderTasksFeed();
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
