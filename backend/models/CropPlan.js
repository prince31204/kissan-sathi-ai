const mongoose = require('mongoose');

/**
 * CropPlan — stores a 90-day crop calendar for a farmer-selected crop.
 * One plan per farmer per (cropKey + sowingDate) combination.
 * dailyTasks stores the generated daily calendar entries.
 */

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String }, // 'irrigation' | 'monitoring' | 'crop_management' | 'weather_alert' | 'stage_milestone'
    priority: { type: String }, // 'critical' | 'high' | 'medium' | 'low'
    title: { type: String },
    titleHi: { type: String },
    action: { type: String },
    reason: { type: String },
    source: { type: String },
    dataType: { type: String }, // 'Observed weather' | 'Forecast-driven alert' | 'Standard crop-stage guidance' | ...
    isForecastDriven: { type: Boolean, default: false },
    completionStatus: { type: String, enum: ['pending', 'completed', 'skipped', 'postponed'], default: 'pending' },
    completedAt: { type: Date },
    userNote: { type: String },
    rescheduledFromDay: { type: Number },
    rescheduledToDay: { type: Number },
    rescheduledReason: { type: String },
    rescheduledOriginalId: { type: String },
  },
  { _id: false, strict: false }
);

const dayEntrySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true },
    date: { type: String, required: true }, // ISO date string YYYY-MM-DD
    dateLabel: { type: String },
    stage: { type: String },
    stageHi: { type: String },
    tasks: [taskSchema],
    weatherContext: { type: mongoose.Schema.Types.Mixed },
    completionStatus: { type: String, enum: ['pending', 'completed', 'skipped', 'postponed'], default: 'pending' },
    completedAt: { type: Date },
    notes: { type: String },
  },
  { _id: false }
);

const cropPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmProfile' },
    cropKey: { type: String, required: true },
    nameEn: { type: String },
    nameHi: { type: String },
    sowingDate: { type: String, required: true }, // ISO date string
    endDate: { type: String }, // sowingDate + 89 days
    // Suitability assessment at plan creation time
    suitabilityScore: { type: Number },
    suitabilityCategory: { type: String },
    isUnsuitable: { type: Boolean, default: false },
    isRisky: { type: Boolean, default: false },
    matchingFactors: [String],
    risks: [String],
    exclusionReasons: [String],
    missingInfo: [String],
    cropSeason: { type: String, default: 'Kharif' }, // 'Kharif' | 'Rabi' | 'Whole Year'
    mlConfidence: { type: Number },
    notes: { type: String },
    // Farm snapshot at plan creation time
    farmSnapshot: { type: mongoose.Schema.Types.Mixed },
    // Weather snapshot at plan creation time
    weatherSnapshot: { type: mongoose.Schema.Types.Mixed },
    weatherLastUpdated: { type: Date },
    // The 90-day calendar
    dailyTasks: [dayEntrySchema],
    // Status
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
    lastAccessedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'cropPlans',
  }
);

cropPlanSchema.index({ userId: 1, status: 1 });
cropPlanSchema.index({ userId: 1, cropKey: 1, sowingDate: 1 }, { unique: true });

module.exports = mongoose.model('CropPlan', cropPlanSchema);
