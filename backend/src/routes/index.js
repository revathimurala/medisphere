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

export default masterRouter;
