import Patient from "../models/Patient.js";
import FHIRResource from "../models/FHIRResource.js";
import HealthTwin from "../models/HealthTwin.js";
import Consent from "../models/Consent.js";
import { producer, topic, kafkaReady } from "../config/kafka.js";
import { mapObservation, patientName, fhirPost } from "./fhirStore.js";

export function validateVitals(v) {
  const ranges = {
    heartRate: [30, 220],
    systolic: [60, 250],
    diastolic: [30, 150],
    spo2: [50, 100]
  };
  return Object.entries(ranges).every(([k, [min, max]]) =>
    v[k] === undefined || (Number(v[k]) >= min && Number(v[k]) <= max)
  );
}

export function calcCompleteness({ patient, labs, vitals, consent, fhirValid }) {
  const checks = [!!patient, labs.length > 0, !!vitals, !!consent, !!fhirValid];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export async function rebuildTwin(patientId) {
  const patient = await Patient.findOne({ fhirId: patientId });
  const resources = await FHIRResource.find({ patientId }).sort({ receivedAt: 1 });
  const obsResources = resources.filter(r => r.resourceType === "Observation");
  const obs = obsResources.map(r => mapObservation(r.resource));
  const wearableResources = obsResources.filter(r =>
    r.resource?.extension?.some(e => e.url === "https://medisphere.local/fhir/StructureDefinition/wearable-vitals")
  );
  const wearableVitals = wearableResources.map(r => {
    try {
      return JSON.parse(r.resource.extension.find(e => e.url.includes("wearable-vitals"))?.valueString || "{}");
    } catch {
      return {};
    }
  });
  const labs = obsResources
    .filter(r => r.resource?.category?.[0]?.coding?.[0]?.code === "laboratory")
    .map(r => mapObservation(r.resource));
  const condResources = resources.filter(r => r.resourceType === "Condition");
  const medResources = resources.filter(r => r.resourceType === "MedicationRequest");

  // Deduplicate conditions by clinical text and clean up duplicate DB resources
  const seenConds = new Set();
  const conditions = [];
  for (const r of condResources) {
    const text = (r.resource?.code?.text || r.resource?.code?.coding?.[0]?.display || "").trim();
    const key = text.toLowerCase();
    if (text && !seenConds.has(key)) {
      seenConds.add(key);
      conditions.push(r.resource);
    } else if (seenConds.has(key) && r._id) {
      FHIRResource.deleteOne({ _id: r._id }).catch(() => {});
    }
  }

  // Deduplicate medications by clinical text and clean up duplicate DB resources
  const seenMeds = new Set();
  const medications = [];
  for (const r of medResources) {
    const text = (r.resource?.medicationCodeableConcept?.text || r.resource?.medicationCodeableConcept?.coding?.[0]?.display || "").trim();
    const key = text.toLowerCase();
    if (text && !seenMeds.has(key)) {
      seenMeds.add(key);
      medications.push(r.resource);
    } else if (seenMeds.has(key) && r._id) {
      FHIRResource.deleteOne({ _id: r._id }).catch(() => {});
    }
  }
  const consent = await Consent.findOne({ patientId, status: "granted" });
  const fhirInvalid = resources.some(r => r.valid === false);
  const latestVitals = wearableVitals.length ? wearableVitals[wearableVitals.length - 1] : null;
  const completeness = calcCompleteness({ patient, labs, vitals: latestVitals, consent, fhirValid: !fhirInvalid });

  return HealthTwin.findOneAndUpdate({ patientId }, {
    patientId,
    demographics: { name: patientName(patient?.resource), gender: patient?.resource?.gender, dob: patient?.resource?.birthDate },
    conditions, medications, observations: obs, wearableVitals, latestVitals, labResults: labs,
    completeness, fhirStatus: fhirInvalid ? "Invalid" : (patient ? "Valid" : "Missing"),
    consentStatus: consent ? "Granted" : "Not Granted",
    lastUpdated: new Date()
  }, { upsert: true, new: true });
}

export async function publishFhirToKafka(resource, stage, actor = "system", shouldRebuild = true) {
  const patientId = resource.resourceType === "Patient" ? resource.id : resource.subject?.reference?.replace("Patient/", "");
  if (!patientId) throw new Error("FHIR resource has no patient reference");
  const envelope = {
    stage, resource, collectedAt: new Date().toISOString(), actor
  };
  if (!kafkaReady) {
    await persistFhirResource(envelope, shouldRebuild);
    return;
  }
  await producer.send({ topic, messages: [{ key: patientId, value: JSON.stringify(envelope) }] });
}

export async function persistFhirResource({ resource, stage }, shouldRebuild = true) {
  const patientId = resource.resourceType === "Patient"
    ? resource.id
    : resource.subject?.reference?.replace("Patient/", "");
  if (!patientId) return;
  const valid = ["Patient", "Observation", "Condition", "MedicationRequest", "DiagnosticReport"].includes(resource.resourceType);
  if (resource.resourceType === "Patient") {
    await Patient.findOneAndUpdate({ fhirId: resource.id }, { fhirId: resource.id, resource, source: "FHIR/Fallback", updatedAt: new Date() }, { upsert: true });
  } else {
    await FHIRResource.findOneAndUpdate(
      { patientId, fhirId: resource.id },
      { patientId, resourceType: resource.resourceType, fhirId: resource.id, resource, source: `FHIR/${stage || "FALLBACK"}`, valid, receivedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  if (shouldRebuild) {
    await rebuildTwin(patientId).catch(() => {});
  }
}

export async function collectToFhirThenKafka(resource, actor, shouldRebuild = true) {
  const fhirResource = await fhirPost(resource.resourceType, resource);
  await publishFhirToKafka(fhirResource, "FHIR", actor, shouldRebuild);
  return fhirResource;
}
