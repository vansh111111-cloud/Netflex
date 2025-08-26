const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },              // Movie title
  description: { type: String },                        // Description / synopsis
  posterUrl: { type: String, required: true },          // Poster image URL
  trailerUrl: { type: String, required: true },         // Trailer video URL
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who uploaded

  // New Fields
  year: { type: Number },                              
  country: { type: String },                            // Country of origin
  genre: { type: String },                              // Genre (Action, Comedy, etc.)
  audioLanguages: { type: [String], default: ['English'] }, // Available languages
  director: { type: String },                           // Director name
  cast: { type: [String] },                             // Array of cast members
  duration: { type: Number },                           // Duration in minutes
  tags: { type: [String] },                             // Extra tags (keywords)
  rating: { type: Number, min: 0, max: 10 },            // Rating (0-10)

  createdAt: { type: Date, default: Date.now }          // Upload timestamp
});

module.exports = mongoose.model('Movie', movieSchema);
