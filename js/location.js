/**
 * ShareSphere - Precision Geolocation & Exact Address Geocoding Engine
 * Real GPS coordinates + High-Accuracy Fallback + Forward Geocoding + Manual Input Support
 */

window.ShareSphereLocation = {
  // Default central coordinate preset (Bangalore Center: 12.9716° N, 77.5946° E)
  DEFAULT_LOCATION: {
    lat: 12.9716,
    lng: 77.5946,
    address: 'Koramangala Community Center, Bangalore'
  },

  // Known neighborhood coordinate dictionary for instant offline / fallback resolution
  KNOWN_LOCALITIES: {
    'koramangala': { lat: 12.9352, lng: 77.6245, address: 'Koramangala, Bangalore, Karnataka' },
    'indiranagar': { lat: 12.9784, lng: 77.6408, address: 'Indiranagar, Bangalore, Karnataka' },
    'whitefield': { lat: 12.9698, lng: 77.7500, address: 'Whitefield, Bangalore, Karnataka' },
    'jayanagar': { lat: 12.9308, lng: 77.5838, address: 'Jayanagar, Bangalore, Karnataka' },
    'mg road': { lat: 12.9756, lng: 77.6066, address: 'MG Road, Bangalore, Karnataka' },
    'hsr layout': { lat: 12.9121, lng: 77.6446, address: 'HSR Layout, Bangalore, Karnataka' },
    'electronic city': { lat: 12.8452, lng: 77.6602, address: 'Electronic City, Bangalore, Karnataka' },
    'bangalore': { lat: 12.9716, lng: 77.5946, address: 'Bangalore Central, Karnataka' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, address: 'Bengaluru Central, Karnataka' },
    'karur': { lat: 10.9601, lng: 78.0766, address: 'Karur, Tamil Nadu' },
    'thalavapalayam': { lat: 10.9850, lng: 78.0200, address: 'Thalavapalayam, Karur, Tamil Nadu' },
    'coimbatore': { lat: 11.0168, lng: 76.9558, address: 'Coimbatore, Tamil Nadu' },
    'chennai': { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu' },
    'mumbai': { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra' },
    'delhi': { lat: 28.6139, lng: 77.2090, address: 'New Delhi, Delhi' },
    'hyderabad': { lat: 17.3850, lng: 78.4867, address: 'Hyderabad, Telangana' },
    'pune': { lat: 18.5204, lng: 73.8567, address: 'Pune, Maharashtra' },
    'kolkata': { lat: 22.5726, lng: 88.3639, address: 'Kolkata, West Bengal' }
  },

  /**
   * Reverse geocode GPS coordinates into an exact street/neighborhood address
   * @param {number} lat 
   * @param {number} lng 
   * @returns {Promise<string>}
   */
  async reverseGeocode(lat, lng) {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) {
      return this.DEFAULT_LOCATION.address;
    }

    try {
      // 1. Try OpenStreetMap Nominatim (High accuracy road, suburb, city, state)
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pLat}&lon=${pLng}&zoom=18&addressdetails=1`;
      const res = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en' },
        cache: 'no-cache'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.pedestrian || a.street || '';
          const neighborhood = a.suburb || a.neighbourhood || a.residential || a.quarter || '';
          const city = a.city || a.town || a.village || a.city_district || a.county || '';
          const state = a.state || '';
          const postcode = a.postcode || '';

          const parts = [road, neighborhood, city, state, postcode].filter(Boolean);
          if (parts.length >= 2) {
            return parts.join(', ');
          }
          if (data.display_name) {
            return data.display_name.split(',').slice(0, 4).join(',').trim();
          }
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode notice:', err.message);
    }

    try {
      // 2. High-speed fallback: BigDataCloud Reverse Geocoding
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pLat}&longitude=${pLng}&localityLanguage=en`;
      const res = await fetch(bdcUrl);
      if (res.ok) {
        const data = await res.json();
        const locality = data.locality || data.localityInfo?.administrative?.[3]?.name || '';
        const city = data.city || data.principalSubdivision || '';
        const country = data.countryName || '';
        const parts = [locality, city, country].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    } catch (err) {
      console.warn('BigDataCloud reverse geocode notice:', err.message);
    }

    return `Area (${pLat.toFixed(4)}° N, ${pLng.toFixed(4)}° E)`;
  },

  /**
   * Forward geocode a neighborhood, city, or landmark string into latitude and longitude
   * @param {string} query 
   * @returns {Promise<{lat: number, lng: number, address: string}>}
   */
  async geocodeAddress(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return this.DEFAULT_LOCATION;
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Check offline dictionary for instant match
    for (const [key, val] of Object.entries(this.KNOWN_LOCALITIES)) {
      if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
        return {
          lat: val.lat,
          lng: val.lng,
          address: val.address
        };
      }
    }

    // 2. Query OpenStreetMap Nominatim Search API
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
      const res = await fetch(searchUrl, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const shortAddress = first.display_name.split(',').slice(0, 3).join(',').trim();
            return {
              lat,
              lng,
              address: shortAddress || query
            };
          }
        }
      }
    } catch (e) {
      console.warn('Nominatim forward search notice:', e.message);
    }

    // 3. Fallback to default coordinates with user's inputted address label
    return {
      lat: this.DEFAULT_LOCATION.lat,
      lng: this.DEFAULT_LOCATION.lng,
      address: query.trim()
    };
  },

  /**
   * Get cached or active user coordinates
   */
  getUserLocation() {
    const cached = sessionStorage.getItem('sharesphere_user_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const lat = parseFloat(parsed.lat);
        const lng = parseFloat(parsed.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return {
            lat,
            lng,
            address: parsed.address || this.DEFAULT_LOCATION.address,
            accuracy: parsed.accuracy || 15
          };
        }
      } catch (e) {
        // pass
      }
    }
    return this.DEFAULT_LOCATION;
  },

  /**
   * Request browser GPS position with high accuracy and progressive fallback
   */
  requestCurrentPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        window.ShareSphereUtils.showToast('Geolocation is not supported by your browser.', 'warning');
        resolve(this.DEFAULT_LOCATION);
        return;
      }

      window.ShareSphereUtils.showToast('Acquiring high-precision GPS satellite fix...', 'info');

      // Attempt 1: High Accuracy GPS (12 second timeout, 30s cache)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = parseFloat(position.coords.latitude);
          const lng = parseFloat(position.coords.longitude);
          const accuracy = Math.round(position.coords.accuracy || 10);
          
          window.ShareSphereUtils.showToast(`GPS fix acquired (±${accuracy}m). Resolving address...`, 'info');
          const exactAddress = await this.reverseGeocode(lat, lng);

          const userCoords = {
            lat,
            lng,
            address: exactAddress,
            accuracy: accuracy
          };

          sessionStorage.setItem('sharesphere_user_location', JSON.stringify(userCoords));
          window.ShareSphereUtils.showToast(`📍 Location Secured: ${exactAddress}`, 'success');
          window.dispatchEvent(new CustomEvent('sharesphere_location_updated', { detail: userCoords }));
          resolve(userCoords);
        },
        async (error) => {
          console.warn('High-accuracy GPS attempt note:', error.message);
          
          // Attempt 2: Standard Accuracy Network Triangulation Fallback
          window.ShareSphereUtils.showToast('Fine-tuning with network location fallback...', 'info');

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = parseFloat(pos.coords.latitude);
              const lng = parseFloat(pos.coords.longitude);
              const exactAddress = await this.reverseGeocode(lat, lng);
              const userCoords = {
                lat,
                lng,
                address: exactAddress,
                accuracy: Math.round(pos.coords.accuracy || 50)
              };
              sessionStorage.setItem('sharesphere_user_location', JSON.stringify(userCoords));
              window.ShareSphereUtils.showToast(`📍 Location Identified: ${exactAddress}`, 'success');
              window.dispatchEvent(new CustomEvent('sharesphere_location_updated', { detail: userCoords }));
              resolve(userCoords);
            },
            (err2) => {
              console.warn('Geolocation fallback notice:', err2.message);
              window.ShareSphereUtils.showToast('GPS unavailable. You can enter your neighborhood manually below.', 'warning');
              const fallback = this.getUserLocation();
              resolve(fallback);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  },

  /**
   * Filter donations by radius (default 10 km) with strict NaN prevention
   */
  filterWithinRadius(donations, maxRadiusKm = 10, customLocation = null) {
    const loc = customLocation || this.getUserLocation();
    const centerLat = parseFloat(loc.lat);
    const centerLng = parseFloat(loc.lng);

    return donations.map(item => {
      const itemLat = parseFloat(item.latitude);
      const itemLng = parseFloat(item.longitude);
      const dist = window.ShareSphereUtils.calculateDistanceKm(centerLat, centerLng, itemLat, itemLng);
      return { ...item, calculatedDistanceKm: Number.isFinite(dist) ? dist : 2.5 };
    }).filter(item => item.calculatedDistanceKm <= maxRadiusKm)
      .sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);
  }
};
