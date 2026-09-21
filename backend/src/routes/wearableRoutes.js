import express from "express";
import {
  getPatientDevices,
  pairDevice,
  streamTelemetry,
  getTelemetry,
  simulateTelemetry,
  getConfig,
  updateConfig
} from "../controllers/wearableController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/wearables/devices/:patientId?", getPatientDevices);
router.post("/wearables/pair", auth, roleGuard("admin", "provider"), pairDevice);
router.post("/wearables/stream", streamTelemetry);
router.get("/wearables/telemetry/:patientId?", getTelemetry);
router.post("/wearables/simulate", simulateTelemetry);
router.get("/wearables/config", auth, getConfig);
router.post("/wearables/config", auth, roleGuard("admin", "provider"), updateConfig);

export default router;
