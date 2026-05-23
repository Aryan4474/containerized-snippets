const mongoose = require('mongoose');

const PasteSchema = new mongoose.Schema(
  {
    // The unique human-readable ID used in the URL to share/retrieve the snippet (e.g., /p/ab8dJ2q9)
    shortId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true // Crucial for performance as we query pastes by shortId
    },
    // The text or code content of the paste
    content: {
      type: String,
      required: [true, 'Paste content is required']
    },
    // Optional title for the paste
    title: {
      type: String,
      default: 'Untitled',
      trim: true
    },
    // View counter tracking how many times the paste has been read
    views: {
      type: Number,
      default: 0
    },
    // Optional expiration date. 
    // MongoDB's TTL index automatically deletes documents once the current time passes the date stored in this field.
    // Specifying "expires: 0" means it will expire exactly at the date/time stored in the field.
    // If set to null, the document will live permanently.
    expiryAt: {
      type: Date,
      default: null,
      index: { expires: 0 } 
    },
    // Token for verifying delete authorization
    deleteToken: {
      type: String,
      required: true
    },
    // Highlight language option selected on creation
    language: {
      type: String,
      default: 'plaintext',
      trim: true
    },
    // Flags if the paste should be destroyed upon first retrieval
    burnOnRead: {
      type: Boolean,
      default: false
    }
  },
  {
    // Automatically adds 'createdAt' and 'updatedAt' fields
    timestamps: true
  }
);

module.exports = mongoose.model('Paste', PasteSchema);
