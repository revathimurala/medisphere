import express from "express";
import {
  getAnomalyStream,
  getAnomalyStats,
  evaluateAnomaly
} from "../controllers/anomalyController.js";

const router = express.Router();

router.get("/anomalies/stream/:patientId?", getAnomalyStream);
router.get("/anomalies/stats", getAnomalyStats);
router.post("/anomalies/evaluate", evaluateAnomaly);

export default router;
