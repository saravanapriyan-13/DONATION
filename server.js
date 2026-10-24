const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Data and Uploads Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for reading/writing collection JSON files
function getCollectionPath(collectionName) {
  const safeName = collectionName.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, `${safeName}.json`);
}

function readCollection(collectionName) {
  const filePath = getCollectionPath(collectionName);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error(`Error reading ${collectionName}:`, err.message);
  }
  return [];
}

function writeCollection(collectionName, items) {
  const filePath = getCollectionPath(collectionName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${collectionName}:`, err.message);
    return false;
  }
}

// Initial 12 Community Seed Donations (Amazon/Flipkart Style Catalog)
const DEFAULT_SEED_DONATIONS = [
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
    description: "Harrison's Principles, Gray's Anatomy, Davidson's. Genuine 20th editions. Very well maintained.",
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

// Initialize donations.json if empty or missing
const existingDonations = readCollection('donations');
if (existingDonations.length === 0) {
  writeCollection('donations', DEFAULT_SEED_DONATIONS);
  console.log('🌱 Seeded 12 default community donations into server database');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ShareSphere',
    version: '2.0.0',
    mode: 'Multi-User Live Shared Database',
    timestamp: new Date().toISOString()
  });
});

// GET all items in a collection (Shared across all users)
app.get('/api/data/:collection', (req, res) => {
  const collectionName = req.params.collection;
  const items = readCollection(collectionName);
  res.json({ success: true, collection: collectionName, count: items.length, data: items });
});

// POST add an item to a collection
app.post('/api/data/:collection', (req, res) => {
  const collectionName = req.params.collection;
  const item = req.body;

  if (!item) {
    return res.status(400).json({ success: false, error: 'Item body is required' });
  }

  const items = readCollection(collectionName);
  const newItem = {
    ...item,
    id: item.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // If item with same ID exists, update it instead of duplicate
  const existingIdx = items.findIndex(i => i.id === newItem.id);
  if (existingIdx !== -1) {
    items[existingIdx] = newItem;
  } else {
    items.unshift(newItem);
  }

  writeCollection(collectionName, items);
  console.log(`[POST /api/data/${collectionName}] Saved item "${newItem.title || newItem.name || newItem.id}" by "${newItem.donorName || 'user'}"`);

  res.status(201).json({ success: true, item: newItem });
});

// PUT update an item in a collection
app.put('/api/data/:collection/:id', (req, res) => {
  const collectionName = req.params.collection;
  const id = req.params.id;
  const updates = req.body;

  const items = readCollection(collectionName);
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  items[index] = {
    ...items[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeCollection(collectionName, items);
  console.log(`[PUT /api/data/${collectionName}/${id}] Updated item`);

  res.json({ success: true, item: items[index] });
});

// DELETE remove an item from a collection
app.delete('/api/data/:collection/:id', (req, res) => {
  const collectionName = req.params.collection;
  const id = req.params.id;

  let items = readCollection(collectionName);
  const initialLength = items.length;
  items = items.filter(i => i.id !== id);

  if (items.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Item not found' });
  }

  writeCollection(collectionName, items);
  console.log(`[DELETE /api/data/${collectionName}/${id}] Removed item`);

  res.json({ success: true, id });
});

// POST Image upload endpoint (supports Base64 data or raw image)
app.post('/api/upload', (req, res) => {
  try {
    const { filename, data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Process base64
    let base64Image = data;
    let ext = 'jpg';

    if (data.includes(';base64,')) {
      const parts = data.split(';base64,');
      const mime = parts[0].split(':')[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      base64Image = parts[1];
    }

    const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(targetPath, Buffer.from(base64Image, 'base64'));

    const publicUrl = `/uploads/${uniqueName}`;
    console.log(`[POST /api/upload] Image saved locally: ${publicUrl}`);

    res.json({ success: true, url: publicUrl, secure_url: publicUrl });
  } catch (err) {
    console.error('Error handling upload:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save image' });
  }
});

// Find Local IP for multi-device network sharing
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  🌐 ShareSphere Platform Server Running!`);
  console.log(`  🔗 Local Access:    http://localhost:${PORT}`);
  console.log(`  📱 Network Access:  http://${localIP}:${PORT} (For friends/other devices)`);
  console.log(`  📦 Shared Storage:  ${DATA_DIR}`);
  console.log(`  🖼️ Photo Uploads:   ${UPLOADS_DIR}`);
  console.log(`  ✨ Flipkart/Amazon Style Multi-User Marketplace Active!`);
  console.log(`=======================================================`);
});
