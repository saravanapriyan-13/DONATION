const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ShareSphere',
    version: '1.0.0',
    description: 'Smart Resource Donation and Community Sharing Platform',
    timestamp: new Date().toISOString()
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  🌐 ShareSphere Platform Server Running!`);
  console.log(`  🔗 Local Access: http://localhost:${PORT}`);
  console.log(`  🌱 Empowering Sustainable Resource Sharing`);
  console.log(`=======================================================`);
});
