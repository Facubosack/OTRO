// Storage & State Management for OTRO
const STORAGE_KEYS = {
  TASKS: 'otro_tasks_v1',
  PROS: 'otro_pros_v1',
  ROLE: 'otro_current_role',
  USER: 'otro_user_profile',
  CHATS: 'otro_chats_v1'
};

const Storage = {
  init() {
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
        avatarColor: 'linear-gradient(135deg, #00D2FF 0%, #3A7BD5 100%)',
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
    const tasks = this.getTasks();
    const task = {
      id: 'task-' + Date.now(),
      createdAt: 'Recién',
      status: 'open',
      bids: [],
      ...newTask
    };
    tasks.unshift(task);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated'));
    return task;
  },

  updateTask(id, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));
      return tasks[index];
    }
    return null;
  },

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('tasksUpdated'));
  },

  addBidToTask(taskId, bidData) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const bid = {
        id: 'bid-' + Date.now(),
        date: 'Recién',
        status: 'pending',
        ...bidData
      };
      if (!task.bids) task.bids = [];
      task.bids.unshift(bid);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));
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
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      window.dispatchEvent(new CustomEvent('tasksUpdated'));
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

  resetDemo() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_DATA.initialTasks));
    localStorage.setItem(STORAGE_KEYS.PROS, JSON.stringify(INITIAL_DATA.pros));
    window.location.reload();
  }
};

// Initialize right away
Storage.init();
