const mongoose = require('mongoose');

const digitalTwinLogSchema = new mongoose.Schema(
  {
    farmerId: {
      type: String,
      default: 'guest_farmer',
      index: true,
    },
    farmerName: {
      type: String,
      default: 'Uttarakhand Farmer',
    },
    village: {
      type: String,
      default: 'Chopta',
    },
    district: {
      type: String,
      default: 'Chamoli',
      index: true,
    },
    // Farm & Crop Attributes
    crop: {
      type: String,
      required: true,
    },
    cropHi: {
      type: String,
    },
    growthStage: {
      type: String,
      default: 'mid',
    },
    growthStageLabel: {
      type: String,
    },
    sowingDate: {
      type: Date,
    },
    farmArea: {
      type: Number,
      required: true,
      default: 1.0,
    },
    areaUnit: {
      type: String,
      default: 'Acre',
    },
    soilType: {
      type: String,
      default: 'Loam',
    },
    irrigationMethod: {
      type: String,
      default: 'Drip',
    },
    // Observation Data & Sources
    soilMoisturePct: {
      type: Number,
      required: true,
    },
    soilMoistureSource: {
      type: String,
      enum: ['sensor', 'manual', 'simulated'],
      default: 'simulated',
    },
    weather: {
      temperature: Number,
      recentRainfallMm: Number,
      forecastRainfallMm: Number,
      source: { type: String, default: 'Open-Meteo & UK Telemetry' },
      observationTimestamp: { type: Date, default: Date.now },
      retrievalTimestamp: { type: Date, default: Date.now },
    },
    // Calculation Results
    calculationResults: {
      status: String,
      statusBadge: String,
      dailyEtcMm: Number,
      effectiveRainfallMm: Number,
      netDeficitMm: Number,
      grossWaterLiters: Number,
      grossWaterM3: Number,
      pumpRuntimeHours: Number,
      reason: String,
      explanation: String,
    },
    // Scenario Comparison Snapshots
    scenarios: {
      lowRain: mongoose.Schema.Types.Mixed,
      expectedRain: mongoose.Schema.Types.Mixed,
      highRain: mongoose.Schema.Types.Mixed,
    },
    // Audit Metadata
    audit: {
      calculationMethod: {
        type: String,
        default: 'FAO-56 Soil Water Depletion Balance v2.1',
      },
      version: {
        type: String,
        default: 'v2.1',
      },
      formula: String,
      assumptions: [String],
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    collection: 'digitalTwinLogs',
  }
);

const DigitalTwinLog = mongoose.model('DigitalTwinLog', digitalTwinLogSchema);

module.exports = DigitalTwinLog;
