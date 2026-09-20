import express from "express";
import {
  getPredictionStats,
  getPatientPrediction,
  getFederatedStatus,
  trainFederatedRound,
  getModelRegistry,
  getMilestone2Validation
} from "../controllers/predictionController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/predictions/stats", auth, getPredictionStats);
router.get("/predictions/:patientId?", auth, getPatientPrediction);
router.get("/models/federated/status", auth, getFederatedStatus);
router.post("/models/federated/train-round", auth, roleGuard("admin", "provider"), trainFederatedRound);
router.get("/models/registry", auth, getModelRegistry);
router.get("/validation/milestone2", auth, getMilestone2Validation);

export default router;
