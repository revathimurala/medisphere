import mongoose from "mongoose";

const twinSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, index: true },
  demographics: mongoose.Schema.Types.Mixed,
  conditions: [mongoose.Schema.Types.Mixed],
  medications: [mongoose.Schema.Types.Mixed],
  latestVitals: mongoose.Schema.Types.Mixed,
  wearableVitals: [mongoose.Schema.Types.Mixed],
  observations: [mongoose.Schema.Types.Mixed],
  labResults: [mongoose.Schema.Types.Mixed],
  completeness: Number,
  fhirStatus: String,
  consentStatus: String,
  lastUpdated: { type: Date, default: Date.now, index: true }
}, { collection: "healthtwins", timestamps: true });

export const HealthTwin = mongoose.models.HealthTwin || mongoose.model("HealthTwin", twinSchema);
export default HealthTwin;
