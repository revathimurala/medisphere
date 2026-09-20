import express from "express";
import {
  getCapabilityStatement,
  getWellKnownSmartConfig,
  getResourceById,
  searchResources,
  validateResource,
  postResource
} from "../controllers/fhirController.js";
import { requireFhirBearer } from "../middleware/fhirAuth.js";

const router = express.Router();

// SMART well-known discovery
router.get([
  "/.well-known/smart-configuration",
  "/fhir/R4/.well-known/smart-configuration",
  "/fhir/.well-known/smart-configuration"
], getWellKnownSmartConfig);

// Capability metadata
router.get(["/fhir/R4/metadata", "/fhir/metadata"], getCapabilityStatement);

// FHIR $validate operation
router.get(["/fhir/R4/\\$validate", "/fhir/\\$validate"], validateResource);
router.post(["/fhir/R4/\\$validate", "/fhir/\\$validate"], validateResource);

// FHIR Resource CRUD
router.get(["/fhir/R4/:resourceType/:id", "/fhir/:resourceType/:id"], requireFhirBearer(false), getResourceById);
router.get(["/fhir/R4/:resourceType", "/fhir/:resourceType"], requireFhirBearer(false), searchResources);
router.post(["/fhir/R4/:resourceType", "/fhir/:resourceType"], requireFhirBearer(true), postResource);

export default router;
