import express from "express";
import {
  collectWearable,
  collectLaboratory,
  streamVitals,
  wearablesRedirect
} from "../controllers/collectController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/collect/wearable", auth, collectWearable);
router.post("/collect/laboratory", auth, collectLaboratory);
router.post("/collect/stream-vitals", auth, streamVitals);
router.post("/wearables/vitals", auth, wearablesRedirect);

export default router;
