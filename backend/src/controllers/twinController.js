import mongoose from "mongoose";
import HealthTwin from "../models/HealthTwin.js";
import Consent from "../models/Consent.js";
import Patient from "../models/Patient.js";
import FHIRResource from "../models/FHIRResource.js";
import { rebuildTwin } from "../services/twinService.js";
import audit from "../services/auditService.js";

/**
 * @route GET /api/twins/:patientId
 * @desc Retrieves complete Digital Health Twin aggregate document for specified patient
 * @access Protected (Provider, or Patient viewing self)
 */
export async function getTwin(req, res) {
  let twin = await HealthTwin.findOne({ patientId: req.params.patientId });
  if (!twin) {
    try {
      twin = await rebuildTwin(req.params.patientId);
    } catch (e) {
      console.warn("rebuildTwin on-demand failed:", e.message);
    }
  }
  if (!twin) return res.status(404).json({ message: "Twin not found for " + req.params.patientId + ". Please verify patient ID." });
  
  // RBAC check: patients may only view their own twin
  if (req.user.role === "patient" && req.user.sub !== req.params.patientId) return res.status(403).json({ message: "RBAC denied" });
  
  let consent = await Consent.findOne({ patientId: req.params.patientId });
  if (!consent) {
    consent = await Consent.findOneAndUpdate(
      { patientId: req.params.patientId },
      { patientId: req.params.patientId, providerId: "clinician-demo", purpose: "clinical-care", status: "granted", updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  
  await audit(req.user.sub, req.user.role, "VIEW_TWIN", req.params.patientId, "SUCCESS");
  const patient = await Patient.findOne({ fhirId: req.params.patientId });
  res.json({ ...twin.toObject(), patient: patient?.resource || null });
}

/**
 * @route GET /api/twins/store/info
 * @desc Returns MongoDB storage telemetry, collection status, host, and twin document count
 * @access Protected
 */
export async function getStoreInfo(req, res) {
  try {
    const count = await HealthTwin.countDocuments();
    const mongoUri = process.env.MONGO_URI || "";
    const isAtlas = mongoUri.includes("mongodb+srv://") || mongoUri.includes("mongodb.net");
    res.json({
      store: "MongoDB",
      collection: HealthTwin.collection.name,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      isAtlas,
      twinCount: count,
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      indexes: await HealthTwin.collection.indexes()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * @route GET /api/twins/:patientId/timeline
 * @desc Returns chronological timeline of vitals, lab results, diagnoses, and prescriptions
 * @access Protected (Provider, or Patient viewing self)
 */
export async function getTimeline(req, res) {
  const patientId = req.params.patientId;
  if (req.user.role === "patient" && req.user.sub !== patientId) return res.status(403).json({ message: "RBAC denied" });
  const resources = await FHIRResource.find({ patientId }).sort({ receivedAt: 1 });
  const timeline = [];

  for (const r of resources) {
    if (r.resourceType === "Observation") {
      const isWearable = r.resource?.extension?.some(e => e.url?.includes("wearable-vitals"));
      if (isWearable) {
        try {
          const v = JSON.parse(r.resource.extension.find(e => e.url?.includes("wearable-vitals"))?.valueString || "{}");
          timeline.push({
            type: "vitals",
            timestamp: v.timestamp || r.receivedAt,
            label: `Wearable Vital Stream`,
            detail: `HR ${v.heartRate} bpm · BP ${v.systolic}/${v.diastolic} mmHg · SpO₂ ${v.spo2}% · ${v.temperature || 36.6}°C`,
            data: v
          });
        } catch {}
      } else {
        const val = r.resource?.valueQuantity?.value;
        const unit = r.resource?.valueQuantity?.unit || "";
        const codeText = r.resource?.code?.text || "Laboratory Observation";
        timeline.push({
          type: "lab",
          timestamp: r.resource?.effectiveDateTime || r.receivedAt,
          label: `Lab Result: ${codeText}`,
          detail: `${val} ${unit}`,
          data: { test: codeText, value: val, unit }
        });
      }
    } else if (r.resourceType === "Condition") {
      timeline.push({
        type: "condition",
        timestamp: r.receivedAt,
        label: `Active Diagnosis: ${r.resource?.code?.text || "Condition"}`,
        detail: `Status: ${r.resource?.clinicalStatus?.coding?.[0]?.code || "active"}`,
        data: r.resource
      });
    } else if (r.resourceType === "MedicationRequest") {
      timeline.push({
        type: "medication",
        timestamp: r.receivedAt,
        label: `Prescription: ${r.resource?.medicationCodeableConcept?.text || "Medication"}`,
        detail: `Status: ${r.resource?.status || "active"}`,
        data: r.resource
      });
    }
  }

  timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(timeline);
}

/**
 * @route GET /api/twins/:patientId/fhir-bundle
 * @desc Exports entire Digital Health Twin state as a standardized HL7 FHIR R4 Bundle
 * @access Protected (Provider, or Patient viewing self)
 */
export async function getFhirBundle(req, res) {
  const patientId = req.params.patientId;
  if (req.user.role === "patient" && req.user.sub !== patientId) return res.status(403).json({ message: "RBAC denied" });
  const [patientDoc, resourceDocs] = await Promise.all([
    Patient.findOne({ fhirId: patientId }),
    FHIRResource.find({ patientId }).sort({ receivedAt: 1 })
  ]);

  const port = Number(process.env.PORT || 4000);
  const entries = [];
  if (patientDoc?.resource) {
    entries.push({
      fullUrl: `http://localhost:${port}/fhir/R4/Patient/${patientId}`,
      resource: patientDoc.resource
    });
  }
  for (const r of resourceDocs) {
    if (r.resource) {
      entries.push({
        fullUrl: `http://localhost:${port}/fhir/R4/${r.resourceType}/${r.fhirId}`,
        resource: r.resource
      });
    }
  }

  const bundle = {
    resourceType: "Bundle",
    id: `bundle-twin-${patientId}-${Date.now()}`,
    type: "collection",
    total: entries.length,
    entry: entries
  };
  res.type("application/fhir+json").json(bundle);
}
