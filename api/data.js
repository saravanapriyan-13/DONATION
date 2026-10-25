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

// Real donations store (dummy items removed)
const SEED_DONATIONS = [];

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
