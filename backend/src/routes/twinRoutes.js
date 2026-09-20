import express from "express";
import { getTwin, getStoreInfo, getTimeline, getFhirBundle } from "../controllers/twinController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/twins/store/info", auth, getStoreInfo);
router.get("/twins/:patientId", auth, getTwin);
router.get("/twins/:patientId/timeline", auth, getTimeline);
router.get("/twins/:patientId/fhir-bundle", auth, getFhirBundle);

export default router;
