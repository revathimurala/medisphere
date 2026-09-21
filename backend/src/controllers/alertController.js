import alertService from "../services/alertEngineService.js";
import wearableService from "../services/wearableIntegrationService.js";
import anomalyService from "../services/anomalyDetectionService.js";

/**
 * @route GET /api/alerts
 * @desc Retrieves alerts with optional filters (patientId, status, severity, limit)
 * @access Public / Protected
 */
export function getAlerts(req, res) {
  const { patientId, status, severity, limit } = req.query;
  const alerts = alertService.getAlerts({ patientId, status, severity, limit });
  res.json({ success: true, count: alerts.length, alerts });
}

/**
 * @route GET /api/alerts/active
 * @desc Retrieves all currently active (non-resolved) clinical alerts
 * @access Public / Protected
 */
export function getActiveAlerts(req, res) {
  const patientId = req.query.patientId || null;
  const activeAlerts = alertService.getActiveAlerts(patientId);
  res.json({ success: true, count: activeAlerts.length, alerts: activeAlerts });
}

/**
 * @route GET /api/alerts/stats
 * @desc Retrieves real-time Alert Engine statistics (SLA compliance, MTTN, counts)
 * @access Public / Protected
 */
export function getAlertStats(req, res) {
  const stats = alertService.getAlertStats();
  res.json({ success: true, stats });
}

/**
 * @route POST /api/alerts/:alertId/acknowledge
 * @desc Acknowledges a clinical alert within SLA window
 * @access Public / Protected
 */
export function acknowledgeAlert(req, res) {
  try {
    const { clinician = "Dr. Evelyn Reed, MD" } = req.body || {};
    const alert = alertService.acknowledgeAlert(req.params.alertId, clinician);
    res.json({ success: true, message: `Alert ${req.params.alertId} acknowledged by ${clinician}`, alert });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

/**
 * @route POST /api/alerts/:alertId/resolve
 * @desc Resolves an active clinical alert with clinical notes
 * @access Public / Protected
 */
export function resolveAlert(req, res) {
  try {
    const { resolutionNotes, clinician = "Dr. Evelyn Reed, MD" } = req.body || {};
    const alert = alertService.resolveAlert(req.params.alertId, resolutionNotes, clinician);
    res.json({ success: true, message: `Alert ${req.params.alertId} resolved`, alert });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

/**
 * @route POST /api/alerts/:alertId/escalate
 * @desc Escalates an alert to ICU / Rapid Response Code Team
 * @access Public / Protected
 */
export function escalateAlert(req, res) {
  try {
    const { reason } = req.body || {};
    const alert = alertService.escalateAlert(req.params.alertId, reason);
    res.json({ success: true, message: `Alert ${req.params.alertId} escalated to Code Team`, alert });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

/**
 * @route POST /api/alerts/simulate
 * @desc Simulates an acute clinical anomaly and triggers alert dispatch
 * @access Public / Protected
 */
export function simulateAlert(req, res) {
  const { patientId = "P002", scenario = "afib_episode" } = req.body || {};
  const simulated = wearableService.generateSimulatedTelemetry(patientId, scenario);
  const validation = wearableService.validateTelemetryPayload(simulated);
  wearableService.recordTelemetryBuffer(patientId, validation.data);
  const anomalyEvaluation = anomalyService.processTelemetryEvent(validation.data);

  let alert = null;
  if (anomalyEvaluation.isAnomaly && anomalyEvaluation.anomalyRecord) {
    alert = alertService.processAnomalyEvent(anomalyEvaluation.anomalyRecord);
  } else {
    alert = alertService.processAnomalyEvent({
      anomalyId: `ANOM-SIM-${patientId}-${Date.now()}`,
      patientId,
      type: "POSSIBLE_AFIB",
      condition: "Possible Atrial Fibrillation (Acute Tachyarrhythmia)",
      severity: "CRITICAL",
      confidence: 0.89,
      zScore: 3.2,
      spikeDelta: 71,
      rmssd: 86.4,
      currentVitals: validation.data
    });
  }

  res.json({
    success: true,
    message: `Alert triggered for patient ${patientId} under scenario: ${scenario}`,
    alert,
    anomaly: anomalyEvaluation
  });
}
