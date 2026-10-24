/**
 * ShareSphere - Firebase, Server API & Cloudinary Unified Integration
 * Supports Real Multi-User Live Sync across different devices and browsers!
 */

// Firebase Configuration (optional, works seamlessly with or without Firebase)
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Cloudinary Configuration (optional, falls back to server /api/upload)
const cloudinaryConfig = {
  cloudName: "",
  uploadPreset: "",
  apiKey: ""
};

// Global Image Upload Helper (Cloudinary or Server Local Uploads)
window.ShareSphereCloudinary = {
  config: cloudinaryConfig,

  /**
   * Upload image file or base64 to Cloudinary or Server
   * @param {File|Blob|string} file 
   * @returns {Promise<string>} secure_url / public_url
   */
  async upload(file) {
    // 1. Try Cloudinary if configured
    if (this.config.cloudName && this.config.uploadPreset && this.config.apiKey) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.config.uploadPreset);
        formData.append('api_key', this.config.apiKey);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.secure_url) {
          console.log("☁️ Cloudinary Upload Success:", data.secure_url);
          return data.secure_url;
        }
      } catch (err) {
        console.warn("Cloudinary upload issue, falling back to server upload:", err.message);
      }
    }

    // 2. Upload to Shared Server /api/upload (accessible to all connected users)
    try {
      let base64Data = '';
      let filename = 'photo.jpg';

      if (typeof file === 'string') {
        base64Data = file;
      } else {
        filename = file.name || 'photo.jpg';
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data: base64Data })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          console.log("💾 Server Upload Success:", json.url);
          return json.url;
        }
      }
    } catch (err) {
      console.warn("Server upload failed, using data URL fallback:", err.message);
    }

    // 3. Fallback to Base64 Data URL if offline
    if (typeof file === 'string') return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
};

// Initialize Firebase SDK instances
let fbApp = null;
let fbAuth = null;
let fbDatabase = null;

try {
  const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.authDomain &&
    firebaseConfig.databaseURL && firebaseConfig.projectId && firebaseConfig.appId;
  if (hasFirebaseConfig && typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps || !firebase.apps.length) {
      fbApp = firebase.initializeApp(firebaseConfig);
    } else {
      fbApp = firebase.app();
    }
    fbAuth = firebase.auth();
    fbDatabase = firebase.database();
    console.log("🔥 Firebase Live SDK Connected (Realtime Database & Auth Active)!");
  } else {
    console.info("⚡ Live Server API Mode Active (Shared Multi-User Database).");
  }
} catch (err) {
  console.warn("Firebase Live Init notice:", err.message);
}

/**
 * Unified Repository with Live Server Database and Firebase Sync
 */
class ShareSphereStore {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'sharesphere_';
    this.isSyncing = false;
    
    // Initial fetch from Server API
    this.syncAllFromAPI();

    // Start background live polling (3 second interval)
    this.startLiveSync();

    // Sync from Firebase RTDB if configured
    this.syncFromFirebaseRTDB();

    // Re-sync whenever user focuses the browser tab
    window.addEventListener('focus', () => this.syncAllFromAPI());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.syncAllFromAPI();
    });
  }

  getCollection(name) {
    const data = localStorage.getItem(this.STORAGE_KEY_PREFIX + name);
    return data ? JSON.parse(data) : [];
  }

  setCollection(name, items, silent = false) {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + name, JSON.stringify(items));
    if (!silent) {
      window.dispatchEvent(new CustomEvent('sharesphere_data_changed', { detail: { collection: name } }));
    }
  }

  findById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => item.id === id) || null;
  }

  /**
   * Sync collections from Server REST API
   */
  async syncCollectionFromAPI(collectionName) {
    try {
      const res = await fetch(`/api/data/${collectionName}`, { cache: 'no-cache' });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        const localItems = this.getCollection(collectionName);
        const serverJson = JSON.stringify(json.data);
        const localJson = JSON.stringify(localItems);

        // Update if server has newer or different data
        if (serverJson !== localJson) {
          this.setCollection(collectionName, json.data, false);
          console.log(`🔄 Synced ${json.data.length} ${collectionName} from shared server database`);
        }
      }
    } catch (err) {
      // Offline fallback
    }
  }

  async syncAllFromAPI() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      await Promise.all([
        this.syncCollectionFromAPI('donations'),
        this.syncCollectionFromAPI('users'),
        this.syncCollectionFromAPI('requests'),
        this.syncCollectionFromAPI('notifications'),
        this.syncCollectionFromAPI('reports')
      ]);
    } finally {
      this.isSyncing = false;
    }
  }

  startLiveSync() {
    setInterval(() => {
      // Periodic check for new donations uploaded by other users/friends
      this.syncCollectionFromAPI('donations');
      this.syncCollectionFromAPI('requests');
      this.syncCollectionFromAPI('notifications');
    }, 3000);
  }

  async insert(name, item) {
    const items = this.getCollection(name);
    const newItem = {
      ...item,
      id: item.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: item.createdAt || new Date().toISOString()
    };
    
    // Optimistic local update
    items.unshift(newItem);
    this.setCollection(name, items);

    // Save to Shared Server API
    try {
      const res = await fetch(`/api/data/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.item) {
          console.log(`🌐 Item saved to shared server database: [${name}/${json.item.id}]`);
        }
      }
    } catch (err) {
      console.warn(`Server API write notice: ${err.message}. Saved locally.`);
    }

    // Sync to live Firebase Realtime Database if configured
    if (fbDatabase) {
      try {
        await fbDatabase.ref(`${name}/${newItem.id}`).set(newItem);
        console.log(`🔥 Synced to Firebase RTDB [${name}/${newItem.id}]`);
      } catch (e) {
        console.warn(`Firebase RTDB write notice: ${e.message}`);
      }
    }

    return newItem;
  }

  async update(name, id, updates) {
    const items = this.getCollection(name);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      this.setCollection(name, items);

      // Save to Shared Server API
      try {
        await fetch(`/api/data/${name}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Server API update notice: ${err.message}`);
      }

      // Sync update to Firebase
      if (fbDatabase) {
        try {
          await fbDatabase.ref(`${name}/${id}`).update(updates);
        } catch (e) {
          console.warn(`Firebase RTDB update notice: ${e.message}`);
        }
      }

      return items[index];
    }
    return null;
  }

  async delete(name, id) {
    const items = this.getCollection(name);
    const filtered = items.filter(item => item.id !== id);
    this.setCollection(name, filtered);

    // Remove from Shared Server API
    try {
      await fetch(`/api/data/${name}/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn(`Server API delete notice: ${err.message}`);
    }

    // Remove from Firebase
    if (fbDatabase) {
      try {
        await fbDatabase.ref(`${name}/${id}`).remove();
      } catch (e) {
        console.warn(`Firebase RTDB delete notice: ${e.message}`);
      }
    }

    return true;
  }

  /**
   * Pull live data from Firebase Realtime Database
   */
  async syncFromFirebaseRTDB() {
    if (!fbDatabase) return;
    const collections = ['donations', 'users', 'requests', 'notifications', 'reports'];
    
    for (const col of collections) {
      try {
        fbDatabase.ref(col).on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const arr = Object.values(val);
            this.setCollection(col, arr);
          }
        });
      } catch (err) {
        // pass
      }
    }
  }
}

// Global Store Instance
window.ShareSphereDB = new ShareSphereStore();
