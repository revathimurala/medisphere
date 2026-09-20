import flService from "../services/federatedLearning.js";
import HealthTwin from "../models/HealthTwin.js";
import Patient from "../models/Patient.js";
import audit from "../services/auditService.js";

/**
 * @route GET /api/predictions/stats
 * @desc Retrieves global prediction statistics (total predictions, risk category breakdown, model accuracy)
 * @access Protected
 */
export function getPredictionStats(req, res) {
  res.json(flService.getPredictionStats());
}

/**
 * @route GET /api/predictions/:patientId?
 * @desc Evaluates Federated Learning risk model on patient's Digital Twin data and returns risk score & recommendations
 * @access Protected (Provider, or Patient viewing self)
 */
export async function getPatientPrediction(req, res) {
  const patientId = req.params.patientId || "P001";
  if (req.user.role === "patient" && req.user.sub !== patientId) {
    return res.status(403).json({ message: "RBAC denied: patient access restricted to self-record" });
  }
  const [twin, patientDoc] = await Promise.all([
    HealthTwin.findOne({ patientId }),
    Patient.findOne({ fhirId: patientId })
  ]);
  const prediction = flService.getPatientRiskPrediction(patientId, twin, patientDoc?.resource);
  res.json(prediction);
}

/**
 * @route GET /api/models/federated/status
 * @desc Retrieves Federated Learning cluster status (active hospital nodes, current round, global loss, accuracy)
 * @access Protected
 */
export function getFederatedStatus(req, res) {
  res.json(flService.getFederatedStatus());
}

/**
 * @route POST /api/models/federated/train-round
 * @desc Triggers next round of decentralized privacy-preserving Federated Learning model training across hospital nodes
 * @access Protected (Admin, Provider)
 */
export async function trainFederatedRound(req, res) {
  const result = flService.trainNextFederatedRound();
  await audit(req.user.sub, req.user.role, "FEDERATED_ROUND_TRAIN", "ALL", `Round ${result.round}`);
  res.json(result);
}

/**
 * @route GET /api/models/registry
 * @desc Lists model registry entries including model versioning, framework details, and clinical deployment status
 * @access Protected
 */
export function getModelRegistry(req, res) {
  res.json(flService.getModelRegistry());
}

/**
 * @route GET /api/validation/milestone2
 * @desc Returns validation test suite metrics for Milestone 2 AI & Federated Learning requirements
 * @access Protected
 */
export function getMilestone2Validation(req, res) {
  res.json(flService.getMilestone2Validation());
}
