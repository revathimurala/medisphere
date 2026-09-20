import AuditLog from "../models/AuditLog.js";

export function audit(actor, role, action, patientId, result, metadata = {}) {
  return AuditLog.create({ actor, role, action, patientId, result, metadata });
}

export default audit;
