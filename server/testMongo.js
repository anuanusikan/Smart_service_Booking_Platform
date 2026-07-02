require('dotenv').config();
const connectDB = require('./Mongotest.js');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Not loaded');
    
    await connectDB();
    console.log('✓ Connection test passed!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Connection test failed:', err.message);
    process.exit(1);
  }
}

testConnection();
