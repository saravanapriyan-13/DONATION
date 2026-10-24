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
    this.seedSharedDonations();
    this.syncFromFirebaseRTDB();
  }

  /**
   * Seed realistic community donations visible to ALL users (shared store simulation)
   * This runs once and seeds demo donations from different donors so explore page is populated.
   */
  seedSharedDonations() {
    const SEED_VERSION = 'sharesphere_seed_v3';
    if (localStorage.getItem(SEED_VERSION)) return;

    const sharedDonations = [
      {
        id: 'don_seed_001', donorId: 'usr_donor_priya', donorName: 'Priya Sharma',
        donorAvatar: 'https://i.pravatar.cc/150?img=47', donorRating: 4.9,
        title: 'Engineering Textbooks (3rd Year CSE)', category: 'Books',
        description: 'Complete set of 3rd year CS textbooks — OS, DBMS, CN, Algorithms. All in excellent condition with highlighted notes.',
        quantity: 6, condition: 'Like New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9352, longitude: 77.6245, location: 'Koramangala, Bangalore',
        expiryDate: null, requestsCount: 3, createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
      },
      {
        id: 'don_seed_002', donorId: 'usr_donor_raj', donorName: 'Raj Kumar',
        donorAvatar: 'https://i.pravatar.cc/150?img=12', donorRating: 5.0,
        title: 'HomeMade Sambar & Rice (4 Portions)', category: 'Food',
        description: 'Freshly cooked sambar rice, rasam and papad. Enough for a family of 4. Made with love today morning.',
        quantity: 4, condition: 'Fresh / New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9783, longitude: 77.6408, location: 'Indiranagar, Bangalore',
        expiryDate: new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0], requestsCount: 1, createdAt: new Date(Date.now() - 45 * 60000).toISOString()
      },
      {
        id: 'don_seed_003', donorId: 'usr_donor_meera', donorName: 'Meera Nair',
        donorAvatar: 'https://i.pravatar.cc/150?img=32', donorRating: 4.8,
        title: 'Kids Winter Clothes Bundle (Age 5-7)', category: 'Clothes',
        description: 'Warm jackets, sweaters, full pants for 5-7 year old kids. Well maintained, no stains. Perfect for winter season.',
        quantity: 8, condition: 'Good Condition', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9141, longitude: 77.6101, location: 'BTM Layout, Bangalore',
        expiryDate: null, requestsCount: 2, createdAt: new Date(Date.now() - 5 * 3600000).toISOString()
      },
      {
        id: 'don_seed_004', donorId: 'usr_donor_arjun', donorName: 'Arjun Patel',
        donorAvatar: 'https://i.pravatar.cc/150?img=53', donorRating: 4.7,
        title: 'Dell Laptop (i5, 8GB RAM, 256 SSD)', category: 'Electronics',
        description: 'Dell Inspiron 5000 series, Windows 11. Works perfectly, just upgrading to a new system. Includes charger and bag.',
        quantity: 1, condition: 'Good Condition', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9582, longitude: 77.6484, location: 'HSR Layout, Bangalore',
        expiryDate: null, requestsCount: 7, createdAt: new Date(Date.now() - 1 * 3600000).toISOString()
      },
      {
        id: 'don_seed_005', donorId: 'usr_donor_kavya', donorName: 'Kavya Reddy',
        donorAvatar: 'https://i.pravatar.cc/150?img=25', donorRating: 5.0,
        title: 'Wooden Study Table with Chair', category: 'Furniture',
        description: 'Solid wood study table (4ft x 2ft) with matching cushioned chair. Minor scratches on table edge. Self pickup.',
        quantity: 1, condition: 'Good Condition', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9002, longitude: 77.5980, location: 'Jayanagar, Bangalore',
        expiryDate: null, requestsCount: 4, createdAt: new Date(Date.now() - 8 * 3600000).toISOString()
      },
      {
        id: 'don_seed_006', donorId: 'usr_donor_suresh', donorName: 'Suresh Pillai',
        donorAvatar: 'https://i.pravatar.cc/150?img=8', donorRating: 4.6,
        title: 'LEGO City & Duplo Sets (Mixed)', category: 'Toys',
        description: 'Collection of LEGO and Duplo sets, mostly complete. Great for kids 3-10 years old. Washed and sorted.',
        quantity: 3, condition: 'Good Condition', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9698, longitude: 77.7499, location: 'Whitefield, Bangalore',
        expiryDate: null, requestsCount: 2, createdAt: new Date(Date.now() - 12 * 3600000).toISOString()
      },
      {
        id: 'don_seed_007', donorId: 'usr_donor_ananya', donorName: 'Ananya Singh',
        donorAvatar: 'https://i.pravatar.cc/150?img=44', donorRating: 4.9,
        title: 'Homemade Biryani (Veg) — 6 Portions', category: 'Food',
        description: 'Freshly made veg biryani with raita and salad. Made for a gathering that got cancelled. Please collect today.',
        quantity: 6, condition: 'Fresh / New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'],
        latitude: 13.0297, longitude: 77.5906, location: 'Hebbal, Bangalore',
        expiryDate: new Date(Date.now() + 6 * 3600000).toISOString().split('T')[0], requestsCount: 0, createdAt: new Date(Date.now() - 25 * 60000).toISOString()
      },
      {
        id: 'don_seed_008', donorId: 'usr_donor_vikram', donorName: 'Vikram Rao',
        donorAvatar: 'https://i.pravatar.cc/150?img=15', donorRating: 4.8,
        title: 'Bluetooth Speaker — Sony SRS-XB23', category: 'Electronics',
        description: 'Sony portable speaker, excellent sound quality. Minor scratch on back. 12h battery. Original box included.',
        quantity: 1, condition: 'Like New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9855, longitude: 77.7480, location: 'Marathahalli, Bangalore',
        expiryDate: null, requestsCount: 5, createdAt: new Date(Date.now() - 3 * 3600000).toISOString()
      },
      {
        id: 'don_seed_009', donorId: 'usr_donor_deepa', donorName: 'Deepa Krishnan',
        donorAvatar: 'https://i.pravatar.cc/150?img=39', donorRating: 4.7,
        title: 'Ladies Office Wear (M/L Size)', category: 'Clothes',
        description: 'Formal shirts, trousers and blazers for office. Medium to Large size. All dry-cleaned and ready to wear.',
        quantity: 10, condition: 'Like New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9279, longitude: 77.6271, location: 'HSR Layout, Bangalore',
        expiryDate: null, requestsCount: 1, createdAt: new Date(Date.now() - 6 * 3600000).toISOString()
      },
      {
        id: 'don_seed_010', donorId: 'usr_donor_sanjay', donorName: 'Sanjay Mehta',
        donorAvatar: 'https://i.pravatar.cc/150?img=6', donorRating: 5.0,
        title: 'Medical Reference Books (MBBS Final Year)', category: 'Books',
        description: 'Harrison\'s Principles, Gray\'s Anatomy, Davidson\'s. Genuine 20th editions. Very well maintained.',
        quantity: 4, condition: 'Good Condition', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9592, longitude: 77.5957, location: 'Rajajinagar, Bangalore',
        expiryDate: null, requestsCount: 8, createdAt: new Date(Date.now() - 20 * 3600000).toISOString()
      },
      {
        id: 'don_seed_011', donorId: 'usr_donor_lakshmi', donorName: 'Lakshmi Venkat',
        donorAvatar: 'https://i.pravatar.cc/150?img=56', donorRating: 4.9,
        title: 'Indoor Plants (5 pots) — Pothos & Money Plant', category: 'Other',
        description: 'Healthy Pothos, Money Plant, and Peace Lily in terracotta pots. Great air purifiers. Self pickup from doorstep.',
        quantity: 5, condition: 'Like New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9450, longitude: 77.5950, location: 'Sadashivanagar, Bangalore',
        expiryDate: null, requestsCount: 0, createdAt: new Date(Date.now() - 30 * 60000).toISOString()
      },
      {
        id: 'don_seed_012', donorId: 'usr_donor_rohit', donorName: 'Rohit Joshi',
        donorAvatar: 'https://i.pravatar.cc/150?img=20', donorRating: 4.6,
        title: 'Yoga Mat & Resistance Bands Kit', category: 'Other',
        description: 'Extra thick 6mm yoga mat (barely used) + set of 3 resistance bands. Perfect for home gym setup.',
        quantity: 1, condition: 'Like New', status: 'Available',
        imageUrls: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80'],
        latitude: 12.9116, longitude: 77.6389, location: 'Silk Board, Bangalore',
        expiryDate: null, requestsCount: 3, createdAt: new Date(Date.now() - 9 * 3600000).toISOString()
      }
    ];

    // Write to localStorage — shared across all browser tabs on this machine
    // (In production with Firebase, all users see the same cloud data)
    const existing = this.getCollection('donations');
    const existingIds = new Set(existing.map(d => d.id));
    const toAdd = sharedDonations.filter(d => !existingIds.has(d.id));
    if (toAdd.length > 0) {
      const merged = [...toAdd, ...existing];
      localStorage.setItem(this.STORAGE_KEY_PREFIX + 'donations', JSON.stringify(merged));
    }

    localStorage.setItem(SEED_VERSION, 'true');
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
