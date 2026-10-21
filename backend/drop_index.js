require('dotenv').config();
const mongoose = require('mongoose');

const dropIndexes = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'kisaanSaathi_ai' });
    console.log("Connected.");
    const db = mongoose.connection.db;
    const collection = db.collection('userData');
    
    console.log("Dropping username_1...");
    try {
      await collection.dropIndex('username_1');
      console.log("username_1 dropped");
    } catch (e) {
      console.log("Could not drop username_1", e.message);
    }

    console.log("Dropping mobile_1...");
    try {
      await collection.dropIndex('mobile_1');
      console.log("mobile_1 dropped");
    } catch (e) {
      console.log("Could not drop mobile_1", e.message);
    }
    
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

dropIndexes();
