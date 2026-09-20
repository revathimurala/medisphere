import express from "express";
import { getConsent, updateConsent } from "../controllers/consentController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/consent/:patientId", auth, getConsent);
router.post("/consent", auth, updateConsent);

export default router;
