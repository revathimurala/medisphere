import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  patientId: { type: String, index: true },
  resourceType: String,
  fhirId: String,
  resource: mongoose.Schema.Types.Mixed,
  source: String,
  valid: Boolean,
  receivedAt: { type: Date, default: Date.now }
});

export const FHIRResource = mongoose.models.FHIRResource || mongoose.model("FHIRResource", resourceSchema);
export default FHIRResource;
