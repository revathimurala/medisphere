import anomalyService from "../services/anomalyDetectionService.js";

export function getAnomalyStream(req, res) {
  const patientId = req.params.patientId || req.query.patientId || "P002";
  const state = anomalyService.getPatientStreamState(patientId);
  res.json({
    success: true,
    ...state
  });
}

export function getAnomalyStats(req, res) {
  const stats = anomalyService.getEngineStats();
  res.json({
    success: true,
    engine: stats
  });
}

export function evaluateAnomaly(req, res) {
  const evaluation = anomalyService.processTelemetryEvent(req.body || {});
  res.json({
    success: true,
    evaluation
  });
}
