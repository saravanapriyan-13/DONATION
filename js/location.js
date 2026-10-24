/**
 * ShareSphere - Geolocation & 10 km Radius Matching Engine
 */

window.ShareSphereLocation = {
  // Default central coordinate preset (Bangalore Center: 12.9716° N, 77.5946° E)
  DEFAULT_LOCATION: {
    lat: 12.9716,
    lng: 77.5946,
    address: 'Koramangala Community Center, Bangalore'
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
   * Request browser GPS position
   */
  requestCurrentPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        window.ShareSphereUtils.showToast('Geolocation is not supported by your browser. Using default city center.', 'warning');
        resolve(this.DEFAULT_LOCATION);
        return;
      }

      window.ShareSphereUtils.showToast('Requesting GPS location permission...', 'info');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Detected Live GPS Location'
          };
          sessionStorage.setItem('sharesphere_user_location', JSON.stringify(userCoords));
          window.ShareSphereUtils.showToast('📍 Location detected successfully!', 'success');
          window.dispatchEvent(new CustomEvent('sharesphere_location_updated', { detail: userCoords }));
          resolve(userCoords);
        },
        (error) => {
          console.warn('Geolocation access issue:', error.message);
          window.ShareSphereUtils.showToast('Location permission denied or unavailable. Using demo community hub.', 'info');
          sessionStorage.setItem('sharesphere_user_location', JSON.stringify(this.DEFAULT_LOCATION));
          resolve(this.DEFAULT_LOCATION);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
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
