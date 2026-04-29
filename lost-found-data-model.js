const mongoose = require("mongoose");

// Lost Item Schema
const lostItemSchema = new mongoose.Schema({
  reporterName: String,
  title: String,
  category: String,
  description: String,

  imagePath: String, // FIXED

  dateLost: Date,
  location: String,
  locationDetails: String,
  contactPhone: String,

  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  status: { type: String, default: "lost" },
  createdAt: { type: Date, default: Date.now },
});

// Found Item Schema
const foundItemSchema = new mongoose.Schema({
  founderName: String,
  brandColor: String,
  itemType: String,
  location: String,
  foundDate: Date,
  description: String,
  contactEmail: String,
  contactPhone: String,

  imagePath: String, // FIXED

  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  status: { type: String, default: "found" },
  createdAt: { type: Date, default: Date.now },
});

const LostItem = mongoose.model("LostItem", lostItemSchema);
const FoundItem = mongoose.model("FoundItem", foundItemSchema);

module.exports = { LostItem, FoundItem };
