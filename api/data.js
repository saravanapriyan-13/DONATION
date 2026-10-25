// Vercel Serverless Function for ShareSphere Multi-User Data Synchronization
const fs = require('fs');
const path = require('path');

// In-Memory cache for serverless instance lifetime
const inMemoryStore = {
  donations: [],
  users: [],
  requests: [],
  notifications: [],
  reports: []
};

// Seed donations
const SEED_DONATIONS = [
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
  }
];

const SEED_USERS = [
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

inMemoryStore.donations = [...SEED_DONATIONS];
inMemoryStore.users = [...SEED_USERS];

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { collection, id, action } = req.query;

  // Handle Image Upload Endpoint
  if (action === 'upload' || req.url.includes('/api/upload')) {
    if (req.method === 'POST') {
      const { data } = req.body || {};
      if (!data) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
      }
      return res.status(200).json({ success: true, url: data });
    }
  }

  if (!collection) {
    return res.status(200).json({
      status: 'online',
      platform: 'ShareSphere Vercel Serverless Sync Engine',
      timestamp: new Date().toISOString()
    });
  }

  const safeCollection = collection.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!inMemoryStore[safeCollection]) {
    inMemoryStore[safeCollection] = [];
  }

  const items = inMemoryStore[safeCollection];

  // GET Collection or Single Item
  if (req.method === 'GET') {
    if (id) {
      const found = items.find(i => i.id === id);
      if (!found) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, item: found });
    }
    return res.status(200).json({ success: true, collection: safeCollection, count: items.length, data: items });
  }

  // POST Insert Item
  if (req.method === 'POST') {
    const item = req.body || {};
    const newItem = {
      ...item,
      id: item.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingIdx = items.findIndex(i => i.id === newItem.id);
    if (existingIdx !== -1) {
      items[existingIdx] = newItem;
    } else {
      items.unshift(newItem);
    }

    return res.status(201).json({ success: true, item: newItem });
  }

  // PUT Update Item
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ success: false, error: 'ID is required' });
    const updates = req.body || {};
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Not found' });

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, item: items[index] });
  }

  // DELETE Remove Item
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ success: false, error: 'ID is required' });
    const initialLen = items.length;
    inMemoryStore[safeCollection] = items.filter(i => i.id !== id);
    if (inMemoryStore[safeCollection].length === initialLen) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    return res.status(200).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
