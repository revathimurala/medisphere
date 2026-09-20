import mongoose from "mongoose";

const auditSchema = new mongoose.Schema({
  actor: String,
  role: String,
  action: String,
  patientId: String,
  result: String,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditSchema);
export default AuditLog;
