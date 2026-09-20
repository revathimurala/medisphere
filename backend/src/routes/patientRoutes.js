import express from "express";
import { getPatients } from "../controllers/patientController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/patients", auth, roleGuard("admin", "provider"), getPatients);

export default router;
