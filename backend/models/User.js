const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    village: { type: String },
    district: { type: String },
    state: { type: String },
    phone: { type: String },
    avatar: { type: String },
    password: {
      type: String,
      required: true,
    },
    resetOtp: {
      type: String,
    },
    resetOtpExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'userData'
  }
);

const User = mongoose.model('User', userSchema);

// Attempt to drop the old username index if it exists, to fix the E11000 error
mongoose.connection.on('connected', () => {
  User.collection.dropIndex('username_1').catch(err => {
    // Ignore error if index doesn't exist
  });
  // Also drop mobile index since we moved to email
  User.collection.dropIndex('mobile_1').catch(err => {});
});

module.exports = User;
