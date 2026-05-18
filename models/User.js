const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,

  email: {
    type: String,
    unique: true,
  },

  userId: {
    type: String,
    unique: true,
  },

  password: String,

  profilePic: {
    type: String,
    default: "/images/default.png",
  },

  googleId: String,
  provider: String,

  phone: {
    type: String,
    default: "",
  },

  bio: {
    type: String,
    default: "",
  },

  campus: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("User", userSchema);