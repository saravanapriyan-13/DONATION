/**
 * ShareSphere - Enterprise Multi-User Data Synchronization Engine
 * Supports:
 * 1. Cloud Firestore & Firebase Realtime Database Live Sync (collection / onSnapshot / addDoc)
 * 2. Enterprise Java/Spring Boot & Express REST APIs (configurable base URL + CORS)
 * 3. Vercel Serverless Function (/api/data)
 * 4. Cross-Tab / Cross-Account BroadcastChannel & Storage Event Live Bus
 * 5. Cloudinary & Server Multipart/Base64 Image Upload
 */

// Global Backend API Base URL (auto-detects Java Spring Boot on 8080 or Express on 3000 or relative /api)
window.SHARE_SPHERE_API_URL = window.SHARE_SPHERE_API_URL || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  (window.location.port !== '3000' && window.location.port !== '8080' && window.location.port !== '')
    ? 'http://localhost:3000' // fallback to local server if on Live Server port 5500
    : ''
);

// Firebase Configuration (Optional: Paste your Firebase/Firestore credentials here)
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

try {
  const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
  if (hasFirebaseConfig && typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps || !firebase.apps.length) {
      fbApp = firebase.initializeApp(firebaseConfig);
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
    if (firebaseConfig.databaseURL && typeof firebase.database === 'function') {
      fbDatabase = firebase.database();
      console.log("🔥 Firebase Realtime Database Connected!");
    }
  } else {
    console.info("⚡ Live Server API Mode Active (Shared Multi-User Database).");
  }
} catch (err) {
  console.warn("Firebase Live Init notice:", err.message);
}

// 12 Initial Community Seed Donations (Fallback if database is brand new)
const DEFAULT_SEED_DONATIONS = [
  {
    id: 'don_seed_001', donorId: 'usr_donor_priya', donorName: 'Priya Sharma',
    donorAvatar: 'https://i.pravatar.cc/150?img=47', donorRating: 4.9,
    title: 'Engineering Textbooks (3rd Year CSE)', category: 'Books',
    description: 'Complete set of 3rd year CS textbooks — OS, DBMS, CN, Algorithms. All in excellent condition with highlighted notes.',
    quantity: 6, condition: 'Like New', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9352, longitude: 77.6245, location: 'Koramangala, Bangalore',
    expiryDate: null, requestsCount: 3, createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'don_seed_002', donorId: 'usr_donor_rahul', donorName: 'Rahul Verma',
    donorAvatar: 'https://i.pravatar.cc/150?img=12', donorRating: 4.8,
    title: 'Fresh Home Cooked Meal (Serves 4)', category: 'Food',
    description: 'Freshly prepared vegetarian rice, dal, and paneer curry. Hygienically packed in insulated containers. Extra from a family lunch.',
    quantity: 4, condition: 'Fresh / New', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9716, longitude: 77.5946, location: 'MG Road, Bangalore',
    expiryDate: new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0], requestsCount: 1, createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'don_seed_003', donorId: 'usr_donor_anita', donorName: 'Anita Desai',
    donorAvatar: 'https://i.pravatar.cc/150?img=32', donorRating: 5.0,
    title: 'Winter Jackets & Sweaters (Size L & XL)', category: 'Clothes',
    description: '3 warm winter jackets and 2 woollen sweaters. Clean, dry-washed and folded. Perfect for cold weather relief.',
    quantity: 5, condition: 'Good Condition', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9784, longitude: 77.6408, location: 'Indiranagar, Bangalore',
    expiryDate: null, requestsCount: 7, createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'don_seed_004', donorId: 'usr_donor_karthik', donorName: 'Karthik Nair',
    donorAvatar: 'https://i.pravatar.cc/150?img=68', donorRating: 4.7,
    title: 'Dell 22-inch Full HD Monitor (HDMI/VGA)', category: 'Electronics',
    description: 'Working 22" 1080p desktop monitor. Great for students or work from home. Power adapter and HDMI cable included.',
    quantity: 1, condition: 'Good Condition', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9250, longitude: 77.5938, location: 'Jayanagar, Bangalore',
    expiryDate: null, requestsCount: 12, createdAt: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 'don_seed_005', donorId: 'usr_donor_meera', donorName: 'Meera Patel',
    donorAvatar: 'https://i.pravatar.cc/150?img=26', donorRating: 4.9,
    title: 'Wooden Study Table & Ergonomic Chair', category: 'Furniture',
    description: 'Solid wood study desk with 2 drawers + adjustable mesh office chair. Slight scuff on desk corner, structurally 100% sound.',
    quantity: 2, condition: 'Good Condition', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9900, longitude: 77.5500, location: 'Malleshwaram, Bangalore',
    expiryDate: null, requestsCount: 9, createdAt: new Date(Date.now() - 28800000).toISOString()
  },
  {
    id: 'don_seed_006', donorId: 'usr_donor_arjun', donorName: 'Arjun Reddy',
    donorAvatar: 'https://i.pravatar.cc/150?img=53', donorRating: 5.0,
    title: 'Kids Building Blocks & STEM Puzzles', category: 'Toys',
    description: 'Full box of classic LEGO style building blocks (over 300 pieces) + 3 wooden brain teaser puzzles for ages 5-12.',
    quantity: 4, condition: 'Like New', status: 'Available',
    imageUrls: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80'],
    latitude: 12.9698, longitude: 77.7499, location: 'Whitefield, Bangalore',
    expiryDate: null, requestsCount: 4, createdAt: new Date(Date.now() - 43200000).toISOString()
  }
];

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
  },
  {
    id: 'usr_donor_priya',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'password123',
    role: 'user',
    status: 'Active',
    avatar: 'https://i.pravatar.cc/150?img=47',
    location: 'Koramangala, Bangalore',
    points: 250,
    rating: 4.9,
    donationsCount: 3,
    requestsCount: 1,
    completedCount: 3,
    peopleHelped: 4,
    badges: ['Eco Starter', 'Community Helper'],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'usr_donor_rahul',
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    password: 'password123',
    role: 'user',
    status: 'Active',
    avatar: 'https://i.pravatar.cc/150?img=12',
    location: 'MG Road, Bangalore',
    points: 120,
    rating: 4.8,
    donationsCount: 2,
    requestsCount: 0,
    completedCount: 2,
    peopleHelped: 2,
    badges: ['Eco Starter'],
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'usr_donor_anita',
    name: 'Anita Desai',
    email: 'anita@example.com',
    password: 'password123',
    role: 'user',
    status: 'Active',
    avatar: 'https://i.pravatar.cc/150?img=32',
    location: 'Indiranagar, Bangalore',
    points: 400,
    rating: 5.0,
    donationsCount: 4,
    requestsCount: 2,
    completedCount: 4,
    peopleHelped: 6,
    badges: ['Eco Starter', 'Community Helper', 'Waste Reducer'],
    createdAt: new Date(Date.now() - 259200000).toISOString()
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

    // Seed initial donations & users if empty
    this.initDefaultSeedData();

    // Initial fetch from Server API
    this.syncAllFromAPI();

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

  initDefaultSeedData() {
    const existing = this.getCollection('donations');
    if (!existing || existing.length === 0) {
      this.setCollection('donations', DEFAULT_SEED_DONATIONS, true);
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
   * Sync collections from Server REST API (Spring Boot, Express, or Vercel serverless)
   */
  async syncCollectionFromAPI(collectionName) {
    try {
      const baseUrl = window.SHARE_SPHERE_API_URL || '';
      const url = `${baseUrl}/api/data/${collectionName}`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        const localItems = this.getCollection(collectionName);
        
        // Merge strategy: Union remote items with local unique items
        const remoteMap = new Map();
        json.data.forEach(item => {
          if (item && item.id) remoteMap.set(item.id, item);
        });

        // Add any local items not yet on the server
        localItems.forEach(item => {
          if (item && item.id && !remoteMap.has(item.id)) {
            remoteMap.set(item.id, item);
          }
        });

        const mergedItems = Array.from(remoteMap.values());
        
        // Sort newest first
        mergedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const serverJson = JSON.stringify(mergedItems);
        const localJson = JSON.stringify(localItems);

        if (serverJson !== localJson) {
          this.setCollection(collectionName, mergedItems, false);
          console.log(`🔄 Synced ${mergedItems.length} ${collectionName} across accounts from shared backend.`);
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
        this.syncCollectionFromAPI('reports')
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

    // 1. Save to Shared Backend Server (Java Spring Boot, Express, or Vercel serverless)
    try {
      const baseUrl = window.SHARE_SPHERE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/data/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.item) {
          console.log(`🌐 Item saved globally to shared backend: [${name}/${json.item.id}]`);
        }
      }
    } catch (err) {
      console.warn(`Backend API write notice: ${err.message}. Saved locally & queued for sync.`);
    }

    // 2. Save to Cloud Firestore (Real-time Cloud Database without donorId filtering)
    if (fbFirestore) {
      try {
        await fbFirestore.collection(name).doc(newItem.id).set(newItem);
        console.log(`🔥 Synced to Cloud Firestore collection [${name}/${newItem.id}]`);
      } catch (e) {
        console.warn(`Firestore write notice: ${e.message}`);
      }
    }

    // 3. Save to Firebase Realtime Database if configured
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

      // 1. Save update to Shared Backend Server
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

      // 2. Sync update to Cloud Firestore
      if (fbFirestore) {
        try {
          await fbFirestore.collection(name).doc(id).set(updates, { merge: true });
        } catch (e) {
          console.warn(`Firestore update notice: ${e.message}`);
        }
      }

      // 3. Sync update to Firebase RTDB
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

    // 1. Remove from Shared Backend Server
    try {
      const baseUrl = window.SHARE_SPHERE_API_URL || '';
      await fetch(`${baseUrl}/api/data/${name}/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn(`Server API delete notice: ${err.message}`);
    }

    // 2. Remove from Cloud Firestore
    if (fbFirestore) {
      try {
        await fbFirestore.collection(name).doc(id).delete();
      } catch (e) {
        console.warn(`Firestore delete notice: ${e.message}`);
      }
    }

    // 3. Remove from Firebase RTDB
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
   * Pull live data from Cloud Firestore (Realtime snapshot listener on public collections)
   */
  async syncFromCloudFirestore() {
    if (!fbFirestore) return;
    const collections = ['donations', 'users', 'requests', 'notifications', 'reports'];

    for (const col of collections) {
      try {
        // Listening to full collection WITHOUT filtering by donorId (public feed)
        fbFirestore.collection(col).onSnapshot((snapshot) => {
          const remoteItems = [];
          snapshot.forEach(doc => {
            remoteItems.push(doc.data());
          });
          if (remoteItems.length > 0) {
            console.log(`🔥 Firestore Snapshot: Received ${remoteItems.length} items for [${col}]`);
            this.setCollection(col, remoteItems);
          }
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
        console.warn(`Firebase RTDB sync error:`, err);
      }
    }
  }
}

// Global Store Instance
window.ShareSphereDB = new ShareSphereStore();
