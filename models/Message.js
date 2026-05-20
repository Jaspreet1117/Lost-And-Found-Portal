const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Which accepted contact request thread this belongs to
    contactRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactRequest",
      required: true,
    },

    // Who sent this message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The message content
    text: {
      type: String,
      required: true,
      trim: true,
    },

    // Has the other party read it?
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
