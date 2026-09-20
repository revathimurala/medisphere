import mongoose from "mongoose";

const consentSchema = new mongoose.Schema({
  patientId: { type: String, index: true },
  providerId: String,
  purpose: String,
  status: { type: String, enum: ["granted", "denied"], default: "granted" },
  updatedAt: { type: Date, default: Date.now }
});

export const Consent = mongoose.models.Consent || mongoose.model("Consent", consentSchema);
export default Consent;
