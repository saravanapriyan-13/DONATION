/**
 * ShareSphere - Enterprise Multi-User Data Synchronization Engine
 * Supports:
 * 1. Cloud Firestore & Firebase Realtime Database Live Sync (collection / onSnapshot / addDoc)
 * 2. Enterprise Java/Spring Boot & Express REST APIs (configurable base URL + CORS)
 * 3. Cross-Device Wi-Fi / LAN Phone Sync (auto-detects host IP and ports)
 * 4. Cross-Tab / Cross-Account BroadcastChannel & Storage Event Live Bus
 * 5. Cloudinary & Server Multipart/Base64 Image Upload
 */

// Dynamically resolve Backend API Base URL across Localhost and Friends' Phones on LAN
function resolveBackendApiUrl() {
  if (typeof window.SHARE_SPHERE_API_URL === 'string' && window.SHARE_SPHERE_API_URL.trim() !== '') {
    return window.SHARE_SPHERE_API_URL;
  }

  const hostname = window.location.hostname || 'localhost';
  const port = window.location.port;
  const protocol = window.location.protocol || 'http:';

  // If already served directly by Express (port 3000) or Spring Boot (port 8080)
  if (port === '3000' || port === '8080') {
    return '';
  }

  // If loaded via Live Server (port 5500) or custom dev port, on PC or Friend's Phone:
  // Route API calls to the server running on port 3000 at the SAME IP address/hostname!
  if (port && port !== '3000' && port !== '8080') {
    return `${protocol}//${hostname}:3000`;
  }

  // If file:// protocol
  if (protocol === 'file:') {
    return 'http://localhost:3000';
  }

  return '';
}

window.SHARE_SPHERE_API_URL = resolveBackendApiUrl();

// Firebase Configuration (Paste your Firebase credentials here, or set window.__FIREBASE_CONFIG__ or localStorage 'sharesphere_firebase_config')
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

// Dynamically resolve Firebase config from environment / window / storage if available
function getResolvedFirebaseConfig() {
  if (typeof window.__FIREBASE_CONFIG__ === 'object' && window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey) {
    return window.__FIREBASE_CONFIG__;
  }
  if (typeof window.firebaseConfig === 'object' && window.firebaseConfig && window.firebaseConfig.apiKey) {
    return window.firebaseConfig;
  }
  try {
    const raw = localStorage.getItem('sharesphere_firebase_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.apiKey || parsed.projectId)) return parsed;
    }
  } catch (_) {}
  return firebaseConfig;
}

// Cloudinary Configuration (Optional: Direct unsigned client-side uploads)
const cloudinaryConfig = {
  cloudName: "",
  uploadPreset: "",
  apiKey: ""
};

// Global Image Upload Helper (Cloudinary, Backend API, or Resilient Fallback)
window.ShareSphereCloudinary = {
  config: cloudinaryConfig,

  /**
   * Upload image file or base64 to Cloudinary or Server
   * @param {File|Blob|string} file 
   * @returns {Promise<string>} secure_url / public_url
   */
  async upload(file) {
    // 1. Try Cloudinary if credentials are configured
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

    // 2. Upload to Shared Backend Server /api/upload
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

      const uploadUrl = (window.SHARE_SPHERE_API_URL || '') + '/api/upload';
      const res = await fetch(uploadUrl, {
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

    // 3. Fallback to Base64 Data URL
    if (typeof file === 'string') return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
};

// Initialize Firebase SDK instances (Firestore + RTDB + Auth)
let fbApp = null;
let fbAuth = null;
let fbFirestore = null;
let fbDatabase = null;

const activeFirebaseConfig = getResolvedFirebaseConfig();

try {
  const hasFirebaseConfig = activeFirebaseConfig.apiKey && (activeFirebaseConfig.projectId || activeFirebaseConfig.authDomain);
  if (hasFirebaseConfig && typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps || !firebase.apps.length) {
      fbApp = firebase.initializeApp(activeFirebaseConfig);
    } else {
      fbApp = firebase.app();
    }
    fbAuth = firebase.auth();
    
    // Cloud Firestore setup (Preferred for web apps)
    if (typeof firebase.firestore === 'function') {
      fbFirestore = firebase.firestore();
      console.log("🔥 Cloud Firestore Connected (Live Multi-User Cloud Database)!");
    }
    
    // Realtime Database setup (if databaseURL is present)
    if (activeFirebaseConfig.databaseURL && typeof firebase.database === 'function') {
      fbDatabase = firebase.database();
      console.log("🔥 Firebase Realtime Database Connected!");
    }
  } else {
    console.info("⚡ Live Server API Mode Active (Shared Multi-User Database).");
  }
} catch (err) {
  console.warn("Firebase Live Init notice:", err.message);
}

// Expose instances globally
window.fbApp = fbApp;
window.fbAuth = fbAuth;
window.fbFirestore = fbFirestore;
window.fbDatabase = fbDatabase;

// All dummy seed donations removed — pure real community listings
const DEFAULT_SEED_DONATIONS = [];

// Seed Users for local and demo authentication
const DEFAULT_SEED_USERS = [
  {
    id: 'usr_admin_default',
    name: 'Administrator',
    email: 'admin@sharesphere.org',
    password: 'password123',
    role: 'admin',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    location: 'Bangalore, India',
    points: 1000,
    rating: 5.0,
    donationsCount: 5,
    requestsCount: 2,
    completedCount: 5,
    peopleHelped: 5,
    badges: ['Platform Admin', 'Eco Anchor', 'Community Champion'],
    createdAt: new Date().toISOString()
  }
];

/**
 * Unified Repository with Live Server Database, Cloud Firestore, and Cross-Account Bus
 */
class ShareSphereStore {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'sharesphere_';
    this.isSyncing = false;
    this.broadcastChannel = null;

    // Cross-tab / Cross-profile Live Sync Bus
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('sharesphere_cross_account_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data && event.data.type === 'DATA_UPDATE') {
            console.log(`📡 Broadcast received: [${event.data.collection}] updated by another account/tab.`);
            this.handleCrossTabUpdate(event.data.collection, event.data.items);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e.message);
      }
    }

    // Storage Event listener for cross-tab sync in identical origin
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(this.STORAGE_KEY_PREFIX)) {
        const col = e.key.replace(this.STORAGE_KEY_PREFIX, '');
        window.dispatchEvent(new CustomEvent('sharesphere_data_changed', { detail: { collection: col } }));
      }
    });

    // Clean up any legacy dummy seed donations
    this.initDefaultSeedData();

    // Check backend connection and sync data immediately
    this.checkAndSyncBackend();

    // Start background live polling (3 second interval)
    this.startLiveSync();

    // Sync from Cloud Firestore if configured
    this.syncFromCloudFirestore();

    // Sync from Firebase RTDB if configured
    this.syncFromFirebaseRTDB();

    // Re-sync whenever user focuses the browser tab
    window.addEventListener('focus', () => this.syncAllFromAPI());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.syncAllFromAPI();
    });
  }

  async checkAndSyncBackend() {
    // Probe primary resolved backend URL
    const baseUrl = window.SHARE_SPHERE_API_URL || '';
    try {
      const ping = await fetch(`${baseUrl}/api/data/donations`, { cache: 'no-cache' });
      if (ping.ok) {
        console.log(`🌐 Connected to ShareSphere Backend at [${baseUrl || 'same origin'}]`);
      }
    } catch (_) {
      // If primary failed and we're not on 3000, try port 3000 on current hostname
      const host = window.location.hostname || 'localhost';
      const altUrl = `http://${host}:3000`;
      try {
        const altPing = await fetch(`${altUrl}/api/data/donations`, { cache: 'no-cache' });
        if (altPing.ok) {
          window.SHARE_SPHERE_API_URL = altUrl;
          console.log(`🌐 Switched to ShareSphere Live Backend at: ${altUrl}`);
        }
      } catch (e) {
        // Fallback to local offline cache
      }
    }
    await this.syncAllFromAPI();
  }

  initDefaultSeedData() {
    // Remove any legacy dummy seed items with id starting with don_seed_
    const existing = this.getCollection('donations');
    if (Array.isArray(existing) && existing.length > 0) {
      const filtered = existing.filter(d => d && d.id && !d.id.startsWith('don_seed_'));
      if (filtered.length !== existing.length) {
        this.setCollection('donations', filtered, true);
        console.log(`🧹 Removed ${existing.length - filtered.length} legacy dummy donations from local storage`);
      }
    }

    const existingUsers = this.getCollection('users');
    if (!existingUsers || existingUsers.length === 0) {
      this.setCollection('users', DEFAULT_SEED_USERS, true);
    }
  }

  handleCrossTabUpdate(collectionName, newItems) {
    if (!Array.isArray(newItems)) return;
    localStorage.setItem(this.STORAGE_KEY_PREFIX + collectionName, JSON.stringify(newItems));
    window.dispatchEvent(new CustomEvent('sharesphere_data_changed', { detail: { collection: collectionName } }));
  }

  getCollection(name) {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_PREFIX + name);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn(`Error reading collection ${name}:`, e);
      return [];
    }
  }

  setCollection(name, items, silent = false) {
    try {
      localStorage.setItem(this.STORAGE_KEY_PREFIX + name, JSON.stringify(items));
      if (!silent) {
        window.dispatchEvent(new CustomEvent('sharesphere_data_changed', { detail: { collection: name } }));
      }
      // Broadcast to other tabs / accounts
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'DATA_UPDATE', collection: name, items });
      }
    } catch (e) {
      console.warn(`Error saving collection ${name}:`, e);
    }
  }

  findById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => item.id === id) || null;
  }

  /**
   * Push an item to the backend server
   */
  async pushItemToServer(name, item) {
    const baseUrl = window.SHARE_SPHERE_API_URL || '';
    try {
      const res = await fetch(`${baseUrl}/api/data/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const json = await res.json();
        console.log(`🌐 Item synced to server database: [${name}/${(json.item && json.item.id) || item.id}]`);
        return true;
      }
    } catch (err) {
      console.warn(`Server push notice for ${name}: ${err.message}. Retained locally.`);
    }
    return false;
  }

  /**
   * Sync collections from Cloud Firestore or Server REST API (Spring Boot, Express, or Vercel serverless)
   */
  async syncCollectionFromAPI(collectionName) {
    // 1. Try Cloud Firestore first if connected
    if (fbFirestore) {
      try {
        const snapshot = await fbFirestore.collection(collectionName).get();
        if (!snapshot.empty) {
          const remoteItems = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.id && !data.id.startsWith('don_seed_')) {
              remoteItems.push(data);
            }
          });
          remoteItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          this.setCollection(collectionName, remoteItems, false);
          console.log(`🔥 Cloud Firestore synced ${remoteItems.length} [${collectionName}]`);
          return;
        }
      } catch (fsErr) {
        console.warn(`Firestore get notice for [${collectionName}]:`, fsErr.message);
      }
    }

    // 2. Sync from Server API
    try {
      const baseUrl = window.SHARE_SPHERE_API_URL || '';
      const url = `${baseUrl}/api/data/${collectionName}`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        // Filter out any legacy dummy seed items
        const remoteItems = json.data.filter(item => item && item.id && !item.id.startsWith('don_seed_'));
        
        // Merge strategy: Remote items + Any local unsynced items
        const remoteMap = new Map();
        remoteItems.forEach(item => {
          if (item && item.id) remoteMap.set(item.id, item);
        });

        const localItems = this.getCollection(collectionName).filter(item => item && item.id && !item.id.startsWith('don_seed_'));

        // Push any local items not yet on the server
        for (const item of localItems) {
          if (item && item.id && !remoteMap.has(item.id)) {
            remoteMap.set(item.id, item);
            this.pushItemToServer(collectionName, item);
          }
        }

        const mergedItems = Array.from(remoteMap.values());
        
        // Sort newest first
        mergedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const serverJson = JSON.stringify(mergedItems);
        const localJson = JSON.stringify(localItems);

        if (serverJson !== localJson) {
          this.setCollection(collectionName, mergedItems, false);
          console.log(`🔄 Synced ${mergedItems.length} ${collectionName} across devices.`);
        }
      }
    } catch (err) {
      // Offline fallback: continue with local cache
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
        this.syncCollectionFromAPI('reports'),
        this.syncCollectionFromAPI('messages')
      ]);
    } finally {
      this.isSyncing = false;
    }
  }

  startLiveSync() {
    setInterval(() => {
      // Periodic live polling for new items uploaded by other accounts/users
      this.syncCollectionFromAPI('donations');
      this.syncCollectionFromAPI('requests');
      this.syncCollectionFromAPI('notifications');
      this.syncCollectionFromAPI('messages');
    }, 2500);
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

    // 1. Save to Cloud Firestore
    if (fbFirestore) {
      try {
        await fbFirestore.collection(name).doc(newItem.id).set(newItem);
        console.log(`🔥 Synced to Cloud Firestore collection [${name}/${newItem.id}]`);
      } catch (e) {
        console.warn(`Firestore write notice: ${e.message}`);
      }
    }

    // 2. Save to Firebase Realtime Database if configured
    if (fbDatabase) {
      try {
        await fbDatabase.ref(`${name}/${newItem.id}`).set(newItem);
        console.log(`🔥 Synced to Firebase RTDB [${name}/${newItem.id}]`);
      } catch (e) {
        console.warn(`Firebase RTDB write notice: ${e.message}`);
      }
    }

    // 3. Save to Shared Backend Server (Express or Spring Boot)
    await this.pushItemToServer(name, newItem);

    return newItem;
  }

  async update(name, id, updates) {
    const items = this.getCollection(name);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      this.setCollection(name, items);

      // 1. Sync update to Cloud Firestore
      if (fbFirestore) {
        try {
          await fbFirestore.collection(name).doc(id).set(updates, { merge: true });
        } catch (e) {
          console.warn(`Firestore update notice: ${e.message}`);
        }
      }

      // 2. Sync update to Firebase RTDB
      if (fbDatabase) {
        try {
          await fbDatabase.ref(`${name}/${id}`).update(updates);
        } catch (e) {
          console.warn(`Firebase RTDB update notice: ${e.message}`);
        }
      }

      // 3. Save update to Shared Backend Server
      try {
        const baseUrl = window.SHARE_SPHERE_API_URL || '';
        await fetch(`${baseUrl}/api/data/${name}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn(`Server API update notice: ${err.message}`);
      }

      return items[index];
    }
    return null;
  }

  async delete(name, id) {
    const items = this.getCollection(name);
    const filtered = items.filter(item => item.id !== id);
    this.setCollection(name, filtered);

    // 1. Remove from Cloud Firestore
    if (fbFirestore) {
      try {
        await fbFirestore.collection(name).doc(id).delete();
      } catch (e) {
        console.warn(`Firestore delete notice: ${e.message}`);
      }
    }

    // 2. Remove from Firebase RTDB
    if (fbDatabase) {
      try {
        await fbDatabase.ref(`${name}/${id}`).remove();
      } catch (e) {
        console.warn(`Firebase RTDB delete notice: ${e.message}`);
      }
    }

    // 3. Remove from Shared Backend Server
    try {
      const baseUrl = window.SHARE_SPHERE_API_URL || '';
      await fetch(`${baseUrl}/api/data/${name}/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn(`Server API delete notice: ${err.message}`);
    }

    return true;
  }

  /**
   * Pull live data from Cloud Firestore (Realtime snapshot listener on public collections)
   */
  async syncFromCloudFirestore() {
    if (!fbFirestore) return;
    const collections = ['donations', 'users', 'requests', 'notifications', 'reports', 'messages'];

    for (const col of collections) {
      try {
        fbFirestore.collection(col).onSnapshot((snapshot) => {
          const remoteItems = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data && data.id && !data.id.startsWith('don_seed_')) {
              remoteItems.push(data);
            }
          });
          remoteItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          console.log(`🔥 Firestore Live Snapshot: [${col}] updated with ${remoteItems.length} items`);
          this.setCollection(col, remoteItems);
        }, (error) => {
          console.warn(`Firestore live snapshot notice for [${col}]:`, error.message);
        });
      } catch (err) {
        console.warn(`Firestore setup error for [${col}]:`, err.message);
      }
    }
  }

  /**
   * Pull live data from Firebase Realtime Database
   */
  async syncFromFirebaseRTDB() {
    if (!fbDatabase) return;
    const collections = ['donations', 'users', 'requests', 'notifications', 'reports', 'messages'];
    
    for (const col of collections) {
      try {
        fbDatabase.ref(col).on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const arr = Object.values(val).filter(item => item && item.id && !item.id.startsWith('don_seed_'));
            arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            this.setCollection(col, arr);
          }
        });
      } catch (err) {
        console.warn(`Firebase RTDB sync error:`, err);
      }
    }
  }
}

// Global Store Instance
window.ShareSphereDB = new ShareSphereStore();
