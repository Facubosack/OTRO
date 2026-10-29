// OTRO - Geolocation, Autocomplete & Distance Calculation Engine
const Geo = {
  userCoords: null, // { lat: number, lng: number, zone: string }

  init() {
    try {
      const cached = localStorage.getItem('otro_user_geo');
      if (cached) {
        this.userCoords = JSON.parse(cached);
      }
    } catch (e) {}
  },

  getUserCoords() {
    return this.userCoords;
  },

  setUserCoords(coords) {
    this.userCoords = coords;
    localStorage.setItem('otro_user_geo', JSON.stringify(coords));
    window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: coords }));
  },

  async getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error('La geolocalización no está soportada en tu dispositivo.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          let msg = 'No se pudo obtener tu ubicación actual.';
          if (err.code === 1) {
            msg = 'Permiso de ubicación denegado. Habilitalo en los ajustes del navegador.';
          } else if (err.code === 2) {
            msg = 'Señal de GPS o ubicación no disponible.';
          } else if (err.code === 3) {
            msg = 'Tiempo de espera de ubicación agotado.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  },

  async reverseGeocode(lat, lng) {
    // 1. Try BigDataCloud reverse geocoding API
    try {
      const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
      if (resp.ok) {
        const data = await resp.json();
        const locality = data.locality || data.city;
        const subLocality = data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name;
        
        if (subLocality && locality && subLocality !== locality) {
          return `${subLocality}, ${locality}`;
        }
        if (locality) return locality;
        if (subLocality) return subLocality;
      }
    } catch (e) {
      console.warn("Reverse geocode (BigDataCloud) falló:", e);
    }

    // 2. Fallback to OpenStreetMap Nominatim
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
        const city = addr.city || addr.town || addr.state;

        if (neighborhood && city) return `${neighborhood}, ${city}`;
        if (neighborhood) return neighborhood;
        if (city) return city;
      }
    } catch (e) {
      console.warn("Reverse geocode (Nominatim) falló:", e);
    }

    return 'Buenos Aires';
  },

  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const nLat1 = parseFloat(lat1);
    const nLon1 = parseFloat(lon1);
    const nLat2 = parseFloat(lat2);
    const nLon2 = parseFloat(lon2);
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (nLat2 - nLat1) * Math.PI / 180;
    const dLon = (nLon2 - nLon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(nLat1 * Math.PI / 180) * Math.cos(nLat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  formatDistance(distanceKm) {
    if (distanceKm === null || distanceKm === undefined) return '';
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `a ${meters} m`;
    }
    return `a ${distanceKm.toFixed(1)} km`;
  },

  /* -------------------------------------------------------------
     AUTOCOMPLETE & SEARCH LOCATIONS (Tipo Google Maps sin costo)
     ------------------------------------------------------------- */
  async searchLocations(query) {
    if (!query || query.trim().length < 3) return [];
    const q = query.trim();

    // 1. Try Photon Geocoder (rápido, pensado para autocompletar)
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.features && data.features.length > 0) {
          const results = [];
          data.features.forEach(f => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [];
            if (coords.length >= 2) {
              const name = props.name || props.city || props.district;
              const state = props.state || '';
              const country = props.country || '';
              const isAr = props.countrycode === 'AR' || (country && country.toLowerCase().includes('argentina'));

              let detail = '';
              if (state && country) detail = `${state}, ${country}`;
              else if (state) detail = state;
              else if (country) detail = country;

              const label = detail ? `${name}, ${detail}` : name;
              results.push({
                name,
                detail,
                label,
                lat: coords[1],
                lng: coords[0],
                isAr
              });
            }
          });

          // Prioritize Argentina matches
          results.sort((a, b) => (b.isAr ? 1 : 0) - (a.isAr ? 1 : 0));
          if (results.length > 0) return results.slice(0, 5);
        }
      }
    } catch (err) {
      console.warn("Photon autocomplete falló:", err);
    }

    // 2. Fallback Nominatim Search
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ar&limit=5&addressdetails=1`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (resp.ok) {
        const items = await resp.json();
        return items.map(item => {
          const addr = item.address || {};
          const name = item.name || addr.suburb || addr.city || addr.town || addr.village;
          const state = addr.state || addr.province || '';
          const detail = state ? `${state}, Argentina` : 'Argentina';
          return {
            name,
            detail,
            label: `${name}, ${detail}`,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
      }
    } catch (err) {
      console.warn("Nominatim autocomplete falló:", err);
    }

    return [];
  },

  attachAutocomplete(inputEl, onSelect) {
    if (!inputEl) return;

    let debounceTimer = null;
    let dropdown = null;

    // Ensure parent has position relative
    const parent = inputEl.parentElement;
    if (parent && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    const removeDropdown = () => {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
    };

    inputEl.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);

      if (query.length < 3) {
        removeDropdown();
        return;
      }

      debounceTimer = setTimeout(async () => {
        const results = await Geo.searchLocations(query);
        if (results.length === 0) {
          removeDropdown();
          return;
        }

        if (!dropdown) {
          dropdown = document.createElement('div');
          dropdown.className = 'geo-autocomplete-dropdown';
          parent.appendChild(dropdown);
        }

        dropdown.innerHTML = results.map((r, idx) => `
          <div class="geo-autocomplete-item" data-idx="${idx}">
            <span class="geo-autocomplete-icon">📍</span>
            <div class="geo-autocomplete-info">
              <span class="geo-autocomplete-main">${Geo.escapeHTML(r.name)}</span>
              <span class="geo-autocomplete-sub">${Geo.escapeHTML(r.detail)}</span>
            </div>
          </div>
        `).join('');

        dropdown.querySelectorAll('.geo-autocomplete-item').forEach(itemEl => {
          itemEl.addEventListener('mousedown', (evt) => {
            evt.preventDefault();
            const idx = parseInt(itemEl.dataset.idx, 10);
            const selected = results[idx];
            if (selected) {
              inputEl.value = selected.label;
              if (typeof onSelect === 'function') {
                onSelect(selected);
              }
            }
            removeDropdown();
          });
        });
      }, 280);
    });

    inputEl.addEventListener('blur', () => {
      setTimeout(removeDropdown, 200);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') removeDropdown();
    });
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

Geo.init();
