import express from "express";
import { getValidation } from "../controllers/validationController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/validation", auth, getValidation);

export default router;
