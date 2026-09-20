import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  fhirId: { type: String, unique: true, index: true },
  resource: mongoose.Schema.Types.Mixed,
  source: { type: String, default: "FHIR" },
  updatedAt: { type: Date, default: Date.now }
});

export const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);
export default Patient;
