import Consent from "../models/Consent.js";
import audit from "../services/auditService.js";
import { rebuildTwin } from "../services/twinService.js";

/**
 * @route GET /api/consent/:patientId
 * @desc Retrieves latest HIPAA consent record for specified patient
 * @access Protected (Provider, or Patient viewing self)
 */
export async function getConsent(req, res) {
  if (req.user.role === "patient" && req.user.sub !== req.params.patientId) {
    return res.status(403).json({ message: "RBAC denied" });
  }
  const consent = await Consent.findOne({ patientId: req.params.patientId }).sort({ updatedAt: -1 });
  if (!consent) return res.status(404).json({ message: "Consent not found" });
  res.json(consent);
}

/**
 * @route POST /api/consent
 * @desc Updates patient consent status (granted / denied) and recalculates Digital Twin completeness
 * @access Protected (Provider, or Patient managing self)
 */
export async function updateConsent(req, res) {
  const { patientId, providerId = req.user.sub, purpose = "clinical", status = "granted" } = req.body || {};
  if (!patientId) return res.status(400).json({ message: "patientId is required" });
  if (req.user.role === "patient" && req.user.sub !== patientId) {
    return res.status(403).json({ message: "RBAC denied: patients may only manage their own consent" });
  }
  
  const c = await Consent.findOneAndUpdate(
    { patientId, providerId, purpose },
    { patientId, providerId, purpose, status, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  
  await audit(req.user.sub, req.user.role, "CONSENT_UPDATE", patientId, status);
  await rebuildTwin(patientId).catch(() => {});
  res.json(c);
}
