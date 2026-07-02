const { MongoClient } = require('mongodb');

let client;

async function connectToMongoDB() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}

// Call this only when your application terminates
async function disconnectFromMongoDB() {
  if (client) {
    await client.close();
  }
}

module.exports = { connectToMongoDB, disconnectFromMongoDB };
