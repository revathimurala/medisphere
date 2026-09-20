import AuditLog from "../models/AuditLog.js";

/**
 * @route GET /api/audit
 * @desc Retrieves latest 100 HIPAA compliance audit logs recording actor, role, action, patientId, and result
 * @access Protected (Admin, Provider)
 */
export async function getAuditLogs(req, res) {
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
  res.json(logs);
}
