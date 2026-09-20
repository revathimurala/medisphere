import express from "express";
import { collectExcel, uploadExcel, downloadTemplate } from "../controllers/demoController.js";
import { auth, roleGuard } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/demo/collect-excel", auth, roleGuard("admin", "provider"), collectExcel);
router.post("/demo/upload-excel", auth, roleGuard("admin", "provider"), uploadExcel);
router.get("/demo/download-template", auth, downloadTemplate);

export default router;
