const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true },
  score: { type: Number, default: 0 },
  winStreak: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
