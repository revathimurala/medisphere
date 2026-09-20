import express from "express";
import { syncPatient } from "../controllers/syncController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/fhir/sync/:patientId", auth, roleGuard("admin", "provider"), syncPatient);

export default router;
