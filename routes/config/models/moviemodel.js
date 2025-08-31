const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },           
  description: { type: String },                       
  posterUrl: { type: String, required: true },     
  trailerUrl: { type: String, required: true },         
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 

  // New Fields
  year: { type: Number },                              
  country: { type: String },                            
  genre: { type: String },                            
  audioLanguages: { type: [String], default: ['English'] },
  director: { type: String },                           
  cast: { type: [String] },                             
  duration: { type: Number },                           
  tags: { type: [String] },                             
  rating: { type: Number, min: 0, max: 10 },          

  createdAt: { type: Date, default: Date.now }       
});

module.exports = mongoose.model('Movie', movieSchema);
