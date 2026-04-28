const mongoose = require("mongoose");

// Lost Item Schema (Matches fields in report-lost.ejs)
const lostItemSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  category: String,
  description: String,
  itemImage: String,
  dateLost: Date,
  location: String,
  locationDetails: String,
  status: { type: String, default: "lost" },
  createdAt: { type: Date, default: Date.now },
});

// Found Item Schema (Matches fields in report-found.ejs)
const foundItemSchema = new mongoose.Schema({
  founderName: String,
  email: String,
  phone: String,
  relation: String,
  itemType: String,
  brandColor: String,
  location: String,
  foundDate: Date,
  details: String,
  itemImage: String,
  status: { type: String, default: "found" },
  createdAt: { type: Date, default: Date.now },
});

const LostItem = mongoose.model("LostItem", lostItemSchema);
const FoundItem = mongoose.model("FoundItem", foundItemSchema);

module.exports = { LostItem, FoundItem };
