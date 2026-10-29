// OTRO - Authentication & User Profile Management (Firebase Auth + Firestore)
const Auth = {
  currentUser: null,
  isAuthReady: false,

  init() {
    this.bindEvents();

    if (typeof auth !== 'undefined' && auth) {
      auth.onAuthStateChanged(async (firebaseUser) => {
        this.isAuthReady = true;
        if (firebaseUser) {
          console.log("👤 Usuario autenticado con Firebase:", firebaseUser.displayName, firebaseUser.email);
          await this.syncUserProfile(firebaseUser);
        } else {
          console.log("👤 No hay sesión activa en Firebase.");
          this.currentUser = null;
          this.updateUI();
          window.dispatchEvent(new CustomEvent('userAuthChanged', { detail: { user: null } }));
        }
      });
    } else {
      console.warn("Firebase Auth no disponible. Usando perfil local por defecto.");
      this.currentUser = Storage.getUser();
      this.updateUI();
    }
  },

  bindEvents() {
    // Google Sign-In button in Auth Modal
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.signInWithGoogle());
    }

    // Avatar button in header (desktop & mobile)
    const avatarBtn = document.getElementById('user-avatar-btn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        if (this.currentUser) {
          this.openProfileModal();
        } else {
          this.openAuthModal('Iniciá sesión para gestionar tus pedidos y perfil');
        }
      });
    }

    // Header Login button (when logged out)
    const headerLoginBtn = document.getElementById('header-login-btn');
    if (headerLoginBtn) {
      headerLoginBtn.addEventListener('click', () => {
        this.openAuthModal('Ingresá a OTRO con tu cuenta de Google');
      });
    }

    // Bottom Navigation Perfil button
    const navBottomProfileBtn = document.getElementById('nav-bottom-profile-btn');
    if (navBottomProfileBtn) {
      navBottomProfileBtn.addEventListener('click', () => {
        if (this.currentUser) {
          this.openProfileModal();
        } else {
          this.openAuthModal('Iniciá sesión para ver tu perfil y pedidos');
        }
      });
    }

    // Profile Modal: Form Submit
    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
    }

    // Profile Modal: Sign Out button
    const signOutBtn = document.getElementById('profile-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => this.signOut());
    }

    // Profile Modal: Role toggle inside profile (Client vs Provider)
    const profileRoleRadios = document.querySelectorAll('input[name="profile-role"]');
    profileRoleRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const providerFields = document.getElementById('provider-extra-fields');
        if (providerFields) {
          providerFields.style.display = e.target.value === 'provider' ? 'block' : 'none';
        }
      });
    });
  },

  async syncUserProfile(firebaseUser) {
    let profileData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Vecino',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || '',
      phone: '',
      zone: 'CABA',
      role: Storage.getRole() || 'client',
      trades: [],
      bio: '',
      hourlyRate: ''
    };

    if (typeof db !== 'undefined' && db) {
      try {
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
          // Merge remote data
          profileData = { ...profileData, ...docSnap.data() };
        } else {
          // Create initial user doc in Firestore
          await userDocRef.set(profileData);
          console.log("🌱 Perfil de usuario creado en Firestore:", firebaseUser.uid);
        }
      } catch (err) {
        console.warn("No se pudo sincronizar perfil con Firestore (usando datos locales):", err);
      }
    }

    this.currentUser = profileData;
    // Save to local storage for offline use
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profileData));
    if (profileData.role) {
      Storage.setRole(profileData.role);
    }

    this.updateUI();
    window.dispatchEvent(new CustomEvent('userAuthChanged', { detail: { user: profileData } }));
  },

  updateUI() {
    const headerLoginBtn = document.getElementById('header-login-btn');
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    const avatarText = document.getElementById('user-avatar-text');
    const avatarImg = document.getElementById('user-avatar-img');

    if (this.currentUser) {
      // User is logged in
      if (headerLoginBtn) headerLoginBtn.style.display = 'none';
      if (userAvatarBtn) {
        userAvatarBtn.style.display = 'flex';
        userAvatarBtn.title = `Perfil: ${this.currentUser.name}`;
      }

      // Check if user has a Google photo
      if (this.currentUser.photoURL && avatarImg) {
        avatarImg.src = this.currentUser.photoURL;
        avatarImg.style.display = 'block';
        if (avatarText) avatarText.style.display = 'none';
      } else if (avatarText) {
        // Initials fallback
        const initials = (this.currentUser.name || 'U')
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        avatarText.textContent = initials;
        avatarText.style.display = 'block';
        if (avatarImg) avatarImg.style.display = 'none';
      }
    } else {
      // User is logged out
      if (headerLoginBtn) headerLoginBtn.style.display = 'inline-flex';
      if (userAvatarBtn) userAvatarBtn.style.display = 'none';
    }
  },

  async signInWithGoogle() {
    if (typeof auth === 'undefined' || !auth || !googleProvider) {
      App.showToast('El servicio de autenticación no está listo.', '⚠️');
      return;
    }

    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span>⏳</span> Conectando con Google...`;
    }

    try {
      const result = await auth.signInWithPopup(googleProvider);
      const user = result.user;
      console.log("✅ Inicio de sesión exitoso con Google:", user.displayName);
      
      this.closeAuthModal();
      App.showToast(`¡Hola, ${user.displayName.split(' ')[0]}! Bienvenido a OTRO.`, '👋');
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        App.showToast('Inicio de sesión cancelado.', 'ℹ️');
      } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
        App.showToast('Falta habilitar el proveedor de Google en la consola de Firebase.', '⚠️');
      } else {
        App.showToast(`Error de autenticación: ${error.message}`, '⚠️');
      }
    } finally {
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Continuar con Google</span>
        `;
      }
    }
  },

  async signOut() {
    if (confirm("¿Estás seguro de que querés cerrar sesión?")) {
      if (typeof auth !== 'undefined' && auth) {
        await auth.signOut();
      }
      this.currentUser = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
      this.closeProfileModal();
      this.updateUI();
      App.showToast('Sesión cerrada correctamente.', '🔒');
      App.switchTab('feed');
    }
  },

  openAuthModal(reasonMessage = '') {
    const modal = document.getElementById('auth-modal');
    const reasonEl = document.getElementById('auth-modal-reason');
    if (!modal) return;

    if (reasonEl) {
      reasonEl.textContent = reasonMessage || 'Ingresá con tu cuenta para publicar tareas o postularte.';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal || !this.currentUser) return;

    // Populate profile fields
    const nameInput = document.getElementById('profile-name-input');
    const phoneInput = document.getElementById('profile-phone-input');
    const zoneInput = document.getElementById('profile-zone-input');
    const emailEl = document.getElementById('profile-user-email');
    const photoEl = document.getElementById('profile-preview-photo');
    const initialsEl = document.getElementById('profile-preview-initials');
    const rateInput = document.getElementById('profile-rate-input');
    const bioInput = document.getElementById('profile-bio-input');

    if (nameInput) nameInput.value = this.currentUser.name || '';
    if (phoneInput) phoneInput.value = this.currentUser.phone || '';
    if (zoneInput) zoneInput.value = this.currentUser.zone || '';
    if (emailEl) emailEl.textContent = this.currentUser.email || 'Sin email';

    const latInput = document.getElementById('profile-lat-input');
    const lngInput = document.getElementById('profile-lng-input');
    if (latInput) latInput.value = this.currentUser.lat || '';
    if (lngInput) lngInput.value = this.currentUser.lng || '';

    if (this.currentUser.photoURL && photoEl) {
      photoEl.src = this.currentUser.photoURL;
      photoEl.style.display = 'block';
      if (initialsEl) initialsEl.style.display = 'none';
    } else if (initialsEl) {
      initialsEl.textContent = (this.currentUser.name || 'U').substring(0, 2).toUpperCase();
      initialsEl.style.display = 'flex';
      if (photoEl) photoEl.style.display = 'none';
    }

    // Role radio buttons
    const role = this.currentUser.role || 'client';
    const roleRadio = document.querySelector(`input[name="profile-role"][value="${role}"]`);
    if (roleRadio) roleRadio.checked = true;

    // Show/hide provider fields
    const providerFields = document.getElementById('provider-extra-fields');
    if (providerFields) {
      providerFields.style.display = role === 'provider' ? 'block' : 'none';
    }

    if (rateInput) rateInput.value = this.currentUser.hourlyRate || '';
    if (bioInput) bioInput.value = this.currentUser.bio || '';

    // Checkboxes for trades
    const trades = this.currentUser.trades || [];
    document.querySelectorAll('input[name="profile-trade"]').forEach(checkbox => {
      checkbox.checked = trades.includes(checkbox.value);
    });

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  async handleProfileSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) return;

    const name = document.getElementById('profile-name-input').value.trim();
    const phone = document.getElementById('profile-phone-input').value.trim();
    const zone = document.getElementById('profile-zone-input').value.trim();
    const role = document.querySelector('input[name="profile-role"]:checked')?.value || 'client';

    const trades = [];
    document.querySelectorAll('input[name="profile-trade"]:checked').forEach(cb => {
      trades.push(cb.value);
    });

    const hourlyRate = document.getElementById('profile-rate-input')?.value.trim() || '';
    const bio = document.getElementById('profile-bio-input')?.value.trim() || '';
    const lat = document.getElementById('profile-lat-input')?.value || this.currentUser.lat || null;
    const lng = document.getElementById('profile-lng-input')?.value || this.currentUser.lng || null;

    if (!name) {
      App.showToast('Por favor completá tu nombre.', '⚠️');
      return;
    }

    const updated = {
      ...this.currentUser,
      name,
      phone,
      zone: zone || 'CABA',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      role,
      trades,
      hourlyRate,
      bio
    };

    this.currentUser = updated;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    Storage.setRole(role);

    // Sync to Firestore
    if (typeof db !== 'undefined' && db && updated.uid) {
      try {
        await db.collection('users').doc(updated.uid).set(updated, { merge: true });
        console.log("☁️ Perfil actualizado en Firestore.");
      } catch (err) {
        console.warn("No se pudo actualizar en Firestore:", err);
      }
    }

    this.updateUI();
    this.closeProfileModal();
    App.showToast('¡Tu perfil fue actualizado con éxito!', '✅');
  }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
