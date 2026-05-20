const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    // --- Common fields (Lost + Found dono ke liye) ---
    status: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },

    title: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    imagePath: {
      type: String,
      default: "",
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --- Lost item specific fields ---
    dateLost: {
      type: Date,
    },

    // --- Found item specific fields ---
    foundDate: {
      type: Date,
    },

    // Legacy fields (agar purane forms mein itemType / brandColor use ho raha tha)
    itemType: {
      type: String,
      default: "",
    },

    brandColor: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);