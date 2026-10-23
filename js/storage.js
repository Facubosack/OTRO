// Storage & State Management for OTRO with Realtime Cloud Sync (Firebase Firestore)
const STORAGE_KEYS = {
  TASKS: 'otro_tasks_v1',
  PROS: 'otro_pros_v1',
  ROLE: 'otro_current_role',
  USER: 'otro_user_profile',
  CHATS: 'otro_chats_v1'
};

const Storage = {
  _tasksCache: [],
  _prosCache: [],
  _unsubscribeTasks: null,
  _unsubscribePros: null,
  isCloudConnected: false,

  init() {
    // One-time purge of old mock data from previous prototype
    if (localStorage.getItem('otro_cleaned_mock_v2') !== 'true') {
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.PROS);
      localStorage.removeItem(STORAGE_KEYS.CHATS);
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (savedUser && savedUser.includes('Facundo M.')) {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      localStorage.setItem('otro_cleaned_mock_v2', 'true');
    }

    // Default Local Storage structures for real data
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROS)) {
      localStorage.setItem(STORAGE_KEYS.PROS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROLE)) {
      localStorage.setItem(STORAGE_KEYS.ROLE, 'client');
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHATS)) {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify({}));
    }

    // Populate memory cache from localStorage
    try {
      this._tasksCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
    } catch (e) {
      this._tasksCache = [];
    }

    try {
      this._prosCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROS)) || [];
    } catch (e) {
      this._prosCache = [];
    }

    // Connect to Firebase Firestore in real-time
    this.initFirestoreSync();
    this.initProsSync();
  },

  async cleanFirestoreMockTasks() {
    if (!db) return;
    try {
      const snapshot = await db.collection('tasks').get();
      if (snapshot.empty) return;

      const batch = db.batch();
      let deleteCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        // Identify mock tasks (task-101 to task-106 or unassigned demo client)
        if (
          doc.id.startsWith('task-10') ||
          data.clientName === 'Facundo M.' ||
          !data.authorId ||
          data.authorId === 'demo-user'
        ) {
          batch.delete(doc.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`🧹 Eliminadas ${deleteCount} tareas de prueba iniciales de Firestore.`);
      }
    } catch (err) {
      console.warn("Error al limpiar tareas mock de Firestore:", err);
    }
  },

  initFirestoreSync() {
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        console.log("📡 Conectando listener en tiempo real de Firestore (colección: tasks)...");
        
        // Clean any lingering mock tasks on connection
        this.cleanFirestoreMockTasks();

        this._unsubscribeTasks = db.collection('tasks').onSnapshot((snapshot) => {
          this.isCloudConnected = true;
          window.dispatchEvent(new CustomEvent('cloudSyncState', { detail: { connected: true } }));

          if (snapshot.empty) {
            this._tasksCache = [];
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
            window.dispatchEvent(new CustomEvent('tasksUpdated'));
            return;
          }

          const remoteTasks = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            // Discard any residual mock tasks
            if (doc.id.startsWith('task-10') || data.clientName === 'Facundo M.' || !data.authorId) {
              return;
            }
            remoteTasks.push({
              id: doc.id,
              ...data
            });
          });

          // Sort by createdAtTimestamp descending (newest first)
          remoteTasks.sort((a, b) => {
            const tA = a.createdAtTimestamp || 0;
            const tB = b.createdAtTimestamp || 0;
            return tB - tA;
          });

          this._tasksCache = remoteTasks;
          localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(remoteTasks));

          console.log(`✅ Firestore sincronizado: ${remoteTasks.length} pedidos reales cargados.`);
          window.dispatchEvent(new CustomEvent('tasksUpdated'));
        }, (error) => {
          console.warn("⚠️ Firestore: Error en listener en tiempo real. Usando caché local:", error);
          this.isCloudConnected = false;
          window.dispatchEvent(new CustomEvent('cloudSyncState', { detail: { connected: false, error: error.message } }));
          if (error && error.code === 'permission-denied') {
            window.dispatchEvent(new CustomEvent('cloudError', {
              detail: { message: '⚠️ Firestore bloqueó la lectura: activá las Reglas en modo prueba en console.firebase.google.com' }
            }));
          }
        });
      } catch (err) {
        console.warn("No se pudo iniciar listener de Firestore:", err);
        this.isCloudConnected = false;
        window.dispatchEvent(new CustomEvent('cloudSyncState', { detail: { connected: false } }));
      }
    } else {
      console.log("ℹ️ Modo local: Firebase no disponible, usando localStorage.");
      window.dispatchEvent(new CustomEvent('cloudSyncState', { detail: { connected: false } }));
    }
  },

  initProsSync() {
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        console.log("📡 Conectando listener de prestadores reales en Firestore (users role=provider)...");
        this._unsubscribePros = db.collection('users').where('role', '==', 'provider').onSnapshot((snapshot) => {
          const realPros = [];
          const tradeLabels = {
            plomeria: 'Plomería & Gas',
            electricidad: 'Electricidad',
            pintura: 'Pintura',
            muebles: 'Armado de Muebles',
            limpieza: 'Limpieza Profunda',
            fletes: 'Fletes & Mudanzas',
            cerrajeria: 'Cerrajería 24hs',
            jardineria: 'Jardinería',
            climatizacion: 'Aire & Calefacción',
            albanileria: 'Albañilería'
          };

          snapshot.forEach(doc => {
            const u = doc.data();
            const trades = u.trades || [];
            const primaryCategory = trades[0] || 'reparaciones';
            const name = u.name || 'Prestador';
            const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            realPros.push({
              id: doc.id,
              name,
              title: u.bio ? (u.bio.length > 55 ? u.bio.substring(0, 55) + '...' : u.bio) : 'Prestador de Oficio Verificado',
              category: primaryCategory,
              badge: 'Vecino Verificado',
              rating: 5.0,
              reviewsCount: 0,
              jobsCompleted: 0,
              hourlyRate: u.hourlyRate || 'A convenir',
              zone: u.zone || 'CABA',
              phone: u.phone ? u.phone.replace(/[^0-9]/g, '') : '',
              avatarColor: '#EA580C',
              avatarPhoto: u.photoURL || '',
              avatarInitials: initials,
              bio: u.bio || 'Especialista en servicios del hogar.',
              skills: trades.map(t => tradeLabels[t] || t),
              whatsappText: `Hola ${name}, te contacto desde la app OTRO para consultar por un trabajo en mi hogar.`
            });
          });

          this._prosCache = realPros;
          localStorage.setItem(STORAGE_KEYS.PROS, JSON.stringify(realPros));
          console.log(`✅ Prestadores sincronizados: ${realPros.length} profesionales registrados.`);
          window.dispatchEvent(new CustomEvent('prosUpdated'));
        }, (err) => {
          console.warn("No se pudieron cargar prestadores desde Firestore:", err);
        });
      } catch (err) {
        console.warn("Error al inicializar prestadores:", err);
      }
    }
  },

  // Role Management
  getRole() {
    return localStorage.getItem(STORAGE_KEYS.ROLE) || 'client';
  },

  setRole(role) {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    window.dispatchEvent(new CustomEvent('roleChanged', { detail: { role } }));
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || { name: 'Vecino', zone: 'CABA' };
    } catch (e) {
      return { name: 'Vecino', zone: 'CABA' };
    }
  },

  // Tasks Management
  getTasks() {
    return this._tasksCache || [];
  },

  getTaskById(id) {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === id);
  },

  createTask(newTask) {
    const taskId = 'task-' + Date.now();
    const task = {
      id: taskId,
      createdAt: 'Recién',
      createdAtTimestamp: Date.now(),
      status: 'open',
      bids: [],
      ...newTask
    };

    // 1. Optimistic Local Update (immediate response in UI)
    const tasks = this.getTasks();
    tasks.unshift(task);
    this._tasksCache = tasks;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated'));

    // 2. Cloud Update (Firestore)
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      db.collection('tasks').doc(taskId).set(task).then(() => {
        console.log("☁️ Tarea sincronizada en Firestore:", taskId);
      }).catch((err) => {
        console.error("Error al guardar en Firestore:", err);
        if (err && err.code === 'permission-denied') {
          window.dispatchEvent(new CustomEvent('cloudError', {
            detail: { message: '⚠️ Firestore rechazó guardar el pedido: activá las Reglas en modo prueba en console.firebase.google.com' }
          }));
        }
      });
    }

    return task;
  },

  updateTask(id, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      this._tasksCache = tasks;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));

      // Cloud Update
      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        db.collection('tasks').doc(id).update(updates).catch((err) => {
          console.error("Error al actualizar tarea en Firestore:", err);
        });
      }

      return tasks[index];
    }
    return null;
  },

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    this._tasksCache = tasks;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated'));

    // Cloud Delete
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      db.collection('tasks').doc(id).delete().catch((err) => {
        console.error("Error al eliminar tarea en Firestore:", err);
      });
    }
  },

  addBidToTask(taskId, bidData) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const bid = {
        id: 'bid-' + Date.now(),
        date: 'Recién',
        createdAtTimestamp: Date.now(),
        status: 'pending',
        ...bidData
      };
      if (!task.bids) task.bids = [];
      task.bids.unshift(bid);
      this._tasksCache = tasks;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));

      // Cloud Update
      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        db.collection('tasks').doc(taskId).update({
          bids: task.bids
        }).then(() => {
          console.log("☁️ Presupuesto sincronizado en Firestore para tarea:", taskId);
        }).catch((err) => {
          console.error("Error al enviar presupuesto a Firestore:", err);
        });
      }

      return bid;
    }
    return null;
  },

  acceptBid(taskId, bidId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && task.bids) {
      task.status = 'assigned';
      task.bids.forEach(b => {
        if (b.id === bidId) {
          b.status = 'accepted';
          task.assignedPro = {
            id: b.proId,
            name: b.proName,
            amount: b.amount
          };
        } else {
          b.status = 'rejected';
        }
      });

      this._tasksCache = tasks;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));

      // Cloud Update
      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        db.collection('tasks').doc(taskId).update({
          status: 'assigned',
          assignedPro: task.assignedPro,
          bids: task.bids
        }).then(() => {
          console.log("☁️ Presupuesto aceptado sincronizado en Firestore:", taskId);
        }).catch((err) => {
          console.error("Error al aceptar presupuesto en Firestore:", err);
        });
      }

      return task;
    }
    return null;
  },

  // Pros Management
  getPros() {
    return this._prosCache || [];
  },

  getProById(id) {
    const pros = this.getPros();
    return pros.find(p => p.id === id);
  },

  // Chats
  getChats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS)) || {};
    } catch (e) {
      return {};
    }
  },

  getConversation(proId) {
    const chats = this.getChats();
    return chats[proId] || [];
  },

  addMessage(proId, messageObj) {
    const chats = this.getChats();
    if (!chats[proId]) {
      chats[proId] = [];
    }
    chats[proId].push(messageObj);
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    window.dispatchEvent(new CustomEvent('chatUpdated', { detail: { proId } }));
    return chats[proId];
  }
};

// Initialize right away
Storage.init();
