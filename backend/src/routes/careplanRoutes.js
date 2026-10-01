import express from "express";
import {
  getCarePlan,
  generateCarePlan,
  evaluateGuidelines,
  updateAdherence,
  syncWearableAdherence,
  getOutcomeMeasurement,
  addClinicalNote,
  signCarePlan,
  getCarePlanStats,
} from "../controllers/careplanController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

// High-level system statistics (clinician only)
router.get("/careplans/stats/overview", auth, roleGuard("admin", "provider"), getCarePlanStats);

// Module 1: AI Careplan Generation (Clinician only) & Retrieval (Protected with patient ownership check)
router.post("/careplans/generate/:patientId?", auth, roleGuard("admin", "provider"), generateCarePlan);
router.get("/careplans/:patientId?", auth, getCarePlan);

// Module 2: Clinical Guideline Engine
router.get("/careplans/:patientId/guidelines", auth, evaluateGuidelines);

// Module 3: Adherence Tracking & Telemetry Sync (Patients can update their own adherence, clinicians can update any)
router.post("/careplans/:patientId/adherence/task", auth, updateAdherence);
router.post("/careplans/:patientId/adherence/wearable-sync", auth, syncWearableAdherence);

// Module 4: Outcome Measurement (23% Hospitalization Reduction)
router.get("/careplans/:patientId/outcomes", auth, getOutcomeMeasurement);

// Module 5: Provider Collaboration & Sign-off (Signing/approving is strictly clinician only)
router.post("/careplans/:patientId/notes", auth, addClinicalNote);
router.post("/careplans/:patientId/sign", auth, roleGuard("admin", "provider"), signCarePlan);
router.post("/careplans/:patientId/approve", auth, roleGuard("admin", "provider"), signCarePlan);

export default router;

