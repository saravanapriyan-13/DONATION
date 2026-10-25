/**
 * ShareSphere - Precision Geolocation & Exact Address Geocoding Engine
 * Real GPS coordinates + Reverse Geocoding for Exact Landmark / Street / City
 */

window.ShareSphereLocation = {
  // Default central coordinate preset (Bangalore Center: 12.9716° N, 77.5946° E)
  DEFAULT_LOCATION: {
    lat: 12.9716,
    lng: 77.5946,
    address: 'Koramangala Community Center, Bangalore'
  },

  /**
   * Reverse geocode GPS coordinates into an exact street/neighborhood address
   * @param {number} lat 
   * @param {number} lng 
   * @returns {Promise<string>}
   */
  async reverseGeocode(lat, lng) {
    try {
      // 1. Try OpenStreetMap Nominatim (High accuracy road, suburb, city, state)
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
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
            // Trim down very long display names
            return data.display_name.split(',').slice(0, 4).join(',').trim();
          }
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode notice:', err.message);
    }

    try {
      // 2. High-speed fallback: BigDataCloud Reverse Geocoding
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
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

    // Fallback formatted coords
    return `Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`;
  },

  /**
   * Get cached or active user coordinates
   */
  getUserLocation() {
    const cached = sessionStorage.getItem('sharesphere_user_location');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // pass
      }
    }
    return this.DEFAULT_LOCATION;
  },

  /**
   * Request browser GPS position and resolve exact address
   */
  requestCurrentPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        window.ShareSphereUtils.showToast('Geolocation is not supported by your browser.', 'warning');
        resolve(this.DEFAULT_LOCATION);
        return;
      }

      window.ShareSphereUtils.showToast('Detecting your exact GPS coordinates...', 'info');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          window.ShareSphereUtils.showToast('Finding exact street & area address...', 'info');
          const exactAddress = await this.reverseGeocode(lat, lng);

          const userCoords = {
            lat,
            lng,
            address: exactAddress,
            accuracy: position.coords.accuracy || 10
          };

          sessionStorage.setItem('sharesphere_user_location', JSON.stringify(userCoords));
          window.ShareSphereUtils.showToast(`📍 Exact Location: ${exactAddress}`, 'success');
          window.dispatchEvent(new CustomEvent('sharesphere_location_updated', { detail: userCoords }));
          resolve(userCoords);
        },
        async (error) => {
          console.warn('Geolocation access issue:', error.message);
          window.ShareSphereUtils.showToast('GPS permission not granted or unavailable. Using default location.', 'warning');
          sessionStorage.setItem('sharesphere_user_location', JSON.stringify(this.DEFAULT_LOCATION));
          resolve(this.DEFAULT_LOCATION);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  /**
   * Filter donations by radius (default 10 km)
   */
  filterWithinRadius(donations, maxRadiusKm = 10, customLocation = null) {
    const loc = customLocation || this.getUserLocation();
    return donations.map(item => {
      const dist = window.ShareSphereUtils.calculateDistanceKm(
        loc.lat,
        loc.lng,
        item.latitude,
        item.longitude
      );
      return { ...item, calculatedDistanceKm: dist };
    }).filter(item => item.calculatedDistanceKm <= maxRadiusKm)
      .sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);
  }
};
