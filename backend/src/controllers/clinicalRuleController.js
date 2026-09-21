import clinicalRuleEngine from "../services/clinicalRuleEngineService.js";
import mobileNotificationService from "../services/mobileNotificationService.js";

export function getRules(req, res) {
  const { category, severity, enabled } = req.query;
  const rules = clinicalRuleEngine.getRules({ category, severity, enabled });
  res.json({ success: true, count: rules.length, rules });
}

export function getStats(req, res) {
  const stats = clinicalRuleEngine.getEngineStats();
  res.json({ success: true, stats });
}

export function getAuditLog(req, res) {
  const limit = req.query.limit || 50;
  const auditLog = clinicalRuleEngine.getEvaluationAuditLog(limit);
  res.json({ success: true, count: auditLog.length, audit: auditLog });
}

export function createRule(req, res) {
  try {
    const newRule = clinicalRuleEngine.createRule(req.body || {});
    res.status(201).json({ success: true, message: `Rule ${newRule.ruleId} registered successfully`, rule: newRule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export function evaluateTelemetry(req, res) {
  const { telemetry = {}, patientContext = {} } = req.body || {};
  const evaluation = clinicalRuleEngine.evaluateTelemetry(telemetry, patientContext);

  if (evaluation.isActionRequired && (evaluation.highestSeverity === "EMERGENCY" || evaluation.highestSeverity === "CRITICAL" || evaluation.highestSeverity === "HIGH")) {
    const primaryRule = evaluation.matchedRules[0] || {};
    mobileNotificationService.dispatchAlertNotification({
      alertId: evaluation.evaluationId,
      patientId: evaluation.patientId,
      patientName: evaluation.patientName,
      severity: evaluation.highestSeverity,
      condition: primaryRule.name,
      currentVitals: evaluation.vitalsEvaluated,
      slaMinutes: primaryRule.slaMinutes || 3.2,
      physicianName: primaryRule.physicianName,
      targetRole: primaryRule.targetRole,
      orderSet: evaluation.generatedOrderSets
    }, "RuleEngineEvaluation");
  }

  res.json({ success: true, evaluation });
}

export function resetDefaults(req, res) {
  const result = clinicalRuleEngine.resetDefaults();
  res.json({ success: true, ...result });
}

export function getRuleById(req, res) {
  const rule = clinicalRuleEngine.getRuleById(req.params.ruleId);
  if (!rule) {
    return res.status(404).json({ success: false, message: `Rule ${req.params.ruleId} not found` });
  }
  res.json({ success: true, rule });
}

export function updateRule(req, res) {
  try {
    const updated = clinicalRuleEngine.updateRule(req.params.ruleId, req.body || {});
    res.json({ success: true, message: `Rule ${req.params.ruleId} updated`, rule: updated });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export function deleteRule(req, res) {
  try {
    const result = clinicalRuleEngine.deleteRule(req.params.ruleId);
    res.json(result);
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export function toggleRule(req, res) {
  try {
    const rule = clinicalRuleEngine.toggleRule(req.params.ruleId);
    res.json({ success: true, message: `Rule ${req.params.ruleId} is now ${rule.enabled ? "ACTIVE" : "DISABLED"}`, rule });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}
