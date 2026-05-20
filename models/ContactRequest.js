const mongoose = require("mongoose");

const contactRequestSchema = new mongoose.Schema(
  {
    // The person who found the item (sender)
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The person who lost the item (receiver / owner)
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The lost item this request is about
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostItem",
      required: true,
    },

    // Snapshot of the lost item title for display in notifications
    lostItemTitle: {
      type: String,
      default: "",
    },

    // Finder's note / initial message
    finderMessage: {
      type: String,
      default: "",
    },

    // Where the finder found it
    foundLocation: {
      type: String,
      default: "",
    },

    // Finder's contact info
    finderContact: {
      type: String,
      default: "",
    },

    // Request lifecycle status
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    // Has the owner read this notification?
    readByOwner: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactRequest", contactRequestSchema);
