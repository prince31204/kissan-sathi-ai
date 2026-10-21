require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

async function test() {
  await connectDB();
  const users = await User.find({});
  console.log("Users in DB:");
  console.log(users);
  process.exit();
}
test();
