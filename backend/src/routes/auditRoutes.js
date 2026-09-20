import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/audit", auth, roleGuard("admin", "provider"), getAuditLogs);

export default router;
