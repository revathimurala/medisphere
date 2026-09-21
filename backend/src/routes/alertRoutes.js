import express from "express";
import {
  getAlerts,
  getActiveAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  escalateAlert,
  simulateAlert
} from "../controllers/alertController.js";

const router = express.Router();

router.get("/alerts", getAlerts);
router.get("/alerts/active", getActiveAlerts);
router.get("/alerts/stats", getAlertStats);
router.post("/alerts/:alertId/acknowledge", acknowledgeAlert);
router.post("/alerts/:alertId/resolve", resolveAlert);
router.post("/alerts/:alertId/escalate", escalateAlert);
router.post("/alerts/simulate", simulateAlert);

export default router;
