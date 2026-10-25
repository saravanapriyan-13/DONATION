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

// Empty seed donations (All donations are real community submissions)
const DEFAULT_SEED_DONATIONS = [];

// Clean up any legacy dummy seed donations from database
const existingDonations = readCollection('donations').filter(d => d && d.id && !d.id.startsWith('don_seed_'));
writeCollection('donations', existingDonations);

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
