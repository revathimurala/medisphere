import express from "express";
import { authRouter, smartRouter } from "./authRoutes.js";
import fhirRoutes from "./fhirRoutes.js";
import patientRoutes from "./patientRoutes.js";
import twinRoutes from "./twinRoutes.js";
import collectRoutes from "./collectRoutes.js";
import demoRoutes from "./demoRoutes.js";
import consentRoutes from "./consentRoutes.js";
import validationRoutes from "./validationRoutes.js";
import auditRoutes from "./auditRoutes.js";
import predictionRoutes from "./predictionRoutes.js";
import syncRoutes from "./syncRoutes.js";
import alertRoutes from "./alertRoutes.js";
import wearableRoutes from "./wearableRoutes.js";
import anomalyRoutes from "./anomalyRoutes.js";
import clinicalRuleRoutes from "./clinicalRuleRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import systemRoutes from "./systemRoutes.js";
import careplanRoutes from "./careplanRoutes.js";

const masterRouter = express.Router();

// Health check endpoint
masterRouter.get("/api/health", (req, res) => res.json({ ok: true, service: "MediSphere Digital Twin Platform" }));

// FHIR R4 Specification & SMART discovery routes
masterRouter.use("/", fhirRoutes);

// Auth & SMART Token routes
masterRouter.use("/api", authRouter);
masterRouter.use("/smart", smartRouter);

// Domain API routes
masterRouter.use("/api", patientRoutes);
masterRouter.use("/api", twinRoutes);
masterRouter.use("/api", collectRoutes);
masterRouter.use("/api", demoRoutes);
masterRouter.use("/api", consentRoutes);
masterRouter.use("/api", validationRoutes);
masterRouter.use("/api", auditRoutes);
masterRouter.use("/api", predictionRoutes);
masterRouter.use("/api", syncRoutes);

// Milestone 3 API routes: Alerts, Wearables, Anomalies, CDS Rules, Notifications, System
masterRouter.use("/api", alertRoutes);
masterRouter.use("/api", wearableRoutes);
masterRouter.use("/api", anomalyRoutes);
masterRouter.use("/api", clinicalRuleRoutes);
masterRouter.use("/api", notificationRoutes);
masterRouter.use("/api", systemRoutes);

// Milestone 4 API routes: Careplan & Intervention Engine
masterRouter.use("/api", careplanRoutes);

export default masterRouter;
