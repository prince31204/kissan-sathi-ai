const mongoose = require('mongoose');

/**
 * FarmProfile — stores a farmer's farm details.
 * Reuses information from User profile (district, state, village).
 * Linked to the user's _id via userId.
 */
const farmProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmName: { type: String, default: 'My Farm' },
    // Location
    state: { type: String, default: 'Uttarakhand' },
    district: { type: String },
    village: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    elevationM: { type: Number }, // metres above sea level
    locationSource: { type: String, enum: ['gps', 'manual', 'profile', 'unknown'], default: 'unknown' },
    // Farm details
    farmAreaValue: { type: Number },
    farmAreaUnit: { type: String, enum: ['Bigha', 'Acre', 'Hectare'], default: 'Bigha' },
    soilType: { type: String, enum: ['Sandy', 'Loamy', 'Loam', 'Clay', 'Sandy Loam', 'Clay Loam', 'Unknown'], default: 'Unknown' },
    irrigationMethod: {
      type: String,
      enum: ['Rainfed', 'Mountain water channel', 'Spring water', 'Drip irrigation', 'Pump/Tubewell', 'Electric Motor', 'Solar Pump', 'Diesel Pump', 'Pahadi Kuhl / Stream', 'Kuhl Gravity Flow', 'Flood Irrigation', 'Sprinkler', 'Unknown'],
      default: 'Unknown',
    },
    waterAvailability: { type: String, enum: ['Sufficient', 'Limited', 'Unknown'], default: 'Unknown' },
    previousCrop: { type: String },
    currentCrop: { type: String },
    sowingDate: { type: Date },
    // Satellite Field Boundary Mapping
    boundaryPolygon: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: {
        type: [[[Number]]], // Array of arrays of [longitude, latitude]
        default: [],
      },
    },
    boundaryPoints: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    areaSqM: { type: Number },
    areaHectares: { type: Number },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'farmProfiles',
  }
);

farmProfileSchema.index({ userId: 1 });

module.exports = mongoose.model('FarmProfile', farmProfileSchema);
