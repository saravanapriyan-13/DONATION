/**
 * ShareSphere - Firebase & Cloudinary Production Integration
 */

// Fill in your own Firebase web app configuration before enabling Firebase.
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

// Configure a restricted unsigned upload preset before enabling browser uploads.
const cloudinaryConfig = {
  cloudName: "",
  uploadPreset: "",
  apiKey: ""
};

// Global Cloudinary Upload Helper
window.ShareSphereCloudinary = {
  config: cloudinaryConfig,

  /**
   * Upload image file or base64 to Cloudinary
   * @param {File|Blob|string} file 
   * @returns {Promise<string>} secure_url
   */
  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.config.uploadPreset);
    formData.append('api_key', this.config.apiKey);

    try {
      if (!this.config.cloudName || !this.config.uploadPreset || !this.config.apiKey) {
        throw new Error('Cloudinary is not configured.');
      }

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.secure_url) {
        console.log("☁️ Cloudinary Upload Success:", data.secure_url);
        return data.secure_url;
      } else {
        console.warn("Cloudinary error response:", data);
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.warn("Cloudinary upload issue, fallback to data url:", err.message);
      // Fallback if offline
      if (typeof file === 'string') return file;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
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
    console.info("Firebase is disabled until a project configuration is provided.");
  }
} catch (err) {
  console.warn("Firebase Live Init notice:", err.message);
}

/**
 * Unified Repository with Live Firebase Sync
 */
class ShareSphereStore {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'sharesphere_';
    this.cleanDemoItemsOnce();
    this.syncFromFirebaseRTDB();
  }

  /**
   * Remove previous demo seed items as requested by user
   */
  cleanDemoItemsOnce() {
    const cleanedFlag = localStorage.getItem('sharesphere_cleaned_demo_v2');
    if (!cleanedFlag) {
      // Remove hardcoded demo donations & demo users
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + 'donations');
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + 'requests');
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + 'notifications');
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + 'reports');
      localStorage.setItem('sharesphere_cleaned_demo_v2', 'true');
    }
  }

  getCollection(name) {
    const data = localStorage.getItem(this.STORAGE_KEY_PREFIX + name);
    return data ? JSON.parse(data) : [];
  }

  setCollection(name, items) {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + name, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('sharesphere_data_changed', { detail: { collection: name } }));
  }

  findById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => item.id === id) || null;
  }

  async insert(name, item) {
    const items = this.getCollection(name);
    const newItem = {
      ...item,
      id: item.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: item.createdAt || new Date().toISOString()
    };
    items.unshift(newItem);
    this.setCollection(name, items);

    // Sync to live Firebase Realtime Database
    if (fbDatabase) {
      try {
        await fbDatabase.ref(`${name}/${newItem.id}`).set(newItem);
        console.log(`🔥 Synced to Firebase RTDB [${name}/${newItem.id}]`);
      } catch (e) {
        console.warn(`Firebase RTDB write notice: ${e.message}. Data preserved locally.`);
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
