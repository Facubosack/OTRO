// Storage & State Management for OTRO with Realtime Cloud Sync (Firebase Firestore)
const STORAGE_KEYS = {
  TASKS: 'otro_tasks_v1',
  PROS: 'otro_pros_v1',
  ROLE: 'otro_current_role',
  USER: 'otro_user_profile',
  CHATS: 'otro_chats_v1'
};

const Storage = {
  _tasksCache: null,
  _unsubscribeTasks: null,
  isCloudConnected: false,

  init() {
    // 1. Initial Local Storage defaults
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_DATA.initialTasks));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROS)) {
      localStorage.setItem(STORAGE_KEYS.PROS, JSON.stringify(INITIAL_DATA.pros));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROLE)) {
      localStorage.setItem(STORAGE_KEYS.ROLE, 'client'); // 'client' or 'provider'
    }
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
        name: 'Facundo M.',
        zone: 'Palermo, CABA',
        avatarColor: '#EA580C',
        avatarInitials: 'FM',
        phone: '5491100000000'
      }));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHATS)) {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify({
        'pro-1': [
          { sender: 'pro', text: '¡Hola Facundo! Vi tu pedido por la pérdida en el vanitory. ¿A qué hora te quedaría más cómodo que pase?', time: '14:20' },
          { sender: 'user', text: 'Hola Matías, si podés venir alrededor de las 16:30 hs sería genial.', time: '14:22' },
          { sender: 'pro', text: '¡Perfecto! Ya salgo para allá con los repuestos.', time: '14:25' }
        ]
      }));
    }

    // Populate memory cache from localStorage first
    try {
      this._tasksCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
    } catch (e) {
      this._tasksCache = INITIAL_DATA.initialTasks;
    }

    // 2. Connect to Firebase Firestore in real-time
    this.initFirestoreSync();
  },

  initFirestoreSync() {
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        console.log("📡 Conectando listener en tiempo real de Firestore (colección: tasks)...");
        
        this._unsubscribeTasks = db.collection('tasks').onSnapshot((snapshot) => {
          this.isCloudConnected = true;
          window.dispatchEvent(new CustomEvent('cloudSyncState', { detail: { connected: true } }));

          if (snapshot.empty) {
            console.log("ℹ️ Firestore: Colección 'tasks' vacía. Sembrando datos iniciales en la nube...");
            this.seedFirestoreInitialData();
            return;
          }

          const remoteTasks = [];
          snapshot.forEach(doc => {
            const data = doc.data();
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

          console.log(`✅ Firestore sincronizado: ${remoteTasks.length} tareas cargadas en vivo.`);
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

  async seedFirestoreInitialData() {
    if (!db) return;
    try {
      const batch = db.batch();
      const initial = INITIAL_DATA.initialTasks;
      let now = Date.now();

      initial.forEach((task, index) => {
        const docRef = db.collection('tasks').doc(task.id);
        const taskWithTime = {
          ...task,
          createdAtTimestamp: now - (index * 600000) // staggered by 10 mins
        };
        batch.set(docRef, taskWithTime);
      });

      await batch.commit();
      console.log("🌱 Datos iniciales cargados en Firestore exitosamente.");
    } catch (err) {
      console.error("Error al sembrar datos en Firestore:", err);
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
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || {};
    } catch (e) {
      return {};
    }
  },

  // Tasks Management
  getTasks() {
    if (this._tasksCache && this._tasksCache.length > 0) {
      return this._tasksCache;
    }
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
    } catch (e) {
      return [];
    }
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
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROS)) || [];
    } catch (e) {
      return [];
    }
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
  },

  async resetDemo() {
    if (confirm("¿Querés restaurar los datos de prueba? Esto reiniciará las tareas.")) {
      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        try {
          const snapshot = await db.collection('tasks').get();
          const batch = db.batch();
          snapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          await this.seedFirestoreInitialData();
        } catch (err) {
          console.error("Error al reiniciar en Firestore:", err);
        }
      }
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_DATA.initialTasks));
      localStorage.setItem(STORAGE_KEYS.PROS, JSON.stringify(INITIAL_DATA.pros));
      window.location.reload();
    }
  }
};

// Initialize right away
Storage.init();
