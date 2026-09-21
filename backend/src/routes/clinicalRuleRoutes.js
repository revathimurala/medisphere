import express from "express";
import {
  getRules,
  getStats,
  getAuditLog,
  createRule,
  evaluateTelemetry,
  resetDefaults,
  getRuleById,
  updateRule,
  deleteRule,
  toggleRule
} from "../controllers/clinicalRuleController.js";

const router = express.Router();

router.get("/clinical-rules", getRules);
router.get("/clinical-rules/stats", getStats);
router.get("/clinical-rules/audit-log", getAuditLog);
router.post("/clinical-rules", createRule);
router.post("/clinical-rules/evaluate", evaluateTelemetry);
router.post("/clinical-rules/reset-defaults", resetDefaults);
router.get("/clinical-rules/:ruleId", getRuleById);
router.put("/clinical-rules/:ruleId", updateRule);
router.delete("/clinical-rules/:ruleId", deleteRule);
router.post("/clinical-rules/:ruleId/toggle", toggleRule);

export default router;
