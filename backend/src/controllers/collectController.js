import HealthTwin from "../models/HealthTwin.js";
import { validateVitals, collectToFhirThenKafka } from "../services/twinService.js";
import audit from "../services/auditService.js";

/**
 * @route POST /api/collect/wearable
 * @desc Validates wearable vital telemetry, converts to FHIR R4 Observation, and queues to Kafka/MongoDB pipeline
 * @access Protected
 */
export async function collectWearable(req, res) {
  const v = { ...req.body };
  if (!v.patientId) return res.status(400).json({ message: "patientId required" });
  if (!validateVitals(v)) return res.status(422).json({ message: "Vitals range validation failed" });
  
  const resource = {
    resourceType: "Observation", id: `wear-${v.patientId}-${Date.now()}`, status: "final",
    subject: { reference: `Patient/${v.patientId}` },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Wearable vital signs" }], text: "Wearable vital signs" },
    valueString: JSON.stringify(v), effectiveDateTime: v.timestamp || new Date().toISOString(),
    extension: [{ url: "https://medisphere.local/fhir/StructureDefinition/wearable-vitals", valueString: JSON.stringify(v) }]
  };

  try {
    const fhirResource = await collectToFhirThenKafka(resource, req.user.sub);
    await audit(req.user.sub, req.user.role, "COLLECT_WEARABLE_FHIR_KAFKA", v.patientId, "SUCCESS");
    res.status(202).json({ pipeline: ["COLLECT", "FHIR", "KAFKA"], resource: fhirResource, queued: true });
  } catch (e) {
    res.status(502).json({ message: "FHIR/Kafka pipeline failed", detail: e.response?.data || e.message });
  }
}

/**
 * @route POST /api/collect/laboratory
 * @desc Ingests laboratory test report, converts to FHIR R4 Observation, and streams to database/twin pipeline
 * @access Protected
 */
export async function collectLaboratory(req, res) {
  const { patientId, testName, value, unit, date } = req.body || {};
  if (!patientId || !testName || value === undefined) {
    return res.status(400).json({ message: "patientId, testName and value are required" });
  }

  const resource = {
    resourceType: "Observation", id: `lab-${patientId}-${Date.now()}`, status: "final",
    subject: { reference: `Patient/${patientId}` },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: { text: testName, coding: [{ system: "http://loinc.org", code: "unknown", display: testName }] },
    valueQuantity: { value: Number(value), unit: unit || "" }, effectiveDateTime: date || new Date().toISOString()
  };

  try {
    const fhirResource = await collectToFhirThenKafka(resource, req.user.sub);
    await audit(req.user.sub, req.user.role, "COLLECT_LAB_FHIR_KAFKA", patientId, "SUCCESS", { testName });
    res.status(202).json({ pipeline: ["COLLECT", "FHIR", "KAFKA"], resource: fhirResource, queued: true });
  } catch (e) {
    res.status(502).json({ message: "FHIR/Kafka pipeline failed", detail: e.response?.data || e.message });
  }
}

/**
 * @route POST /api/collect/stream-vitals
 * @desc Simulates live real-time wearable vital streaming (HR, BP, SpO2, Temp) with realistic physiological jitter
 * @access Protected
 */
export async function streamVitals(req, res) {
  const { patientId = "P001" } = req.body || {};
  const twin = await HealthTwin.findOne({ patientId });
  const prev = twin?.latestVitals || {};
  
  // Calculate dynamic physiological jitter
  const hrJitter = Math.floor(Math.random() * 5) - 2;
  const hr = Math.min(100, Math.max(65, (Number(prev.heartRate) || 75) + hrJitter));
  const sysJitter = Math.floor(Math.random() * 5) - 2;
  const sys = Math.min(145, Math.max(110, (Number(prev.systolic) || 122) + sysJitter));
  const diaJitter = Math.floor(Math.random() * 3) - 1;
  const dia = Math.min(90, Math.max(70, (Number(prev.diastolic) || 80) + diaJitter));
  const spo2 = Math.min(100, Math.max(95, (Number(prev.spo2) || 98) + (Math.random() > 0.5 ? 1 : 0)));
  const temp = Number((36.5 + Math.random() * 0.4).toFixed(1));

  const v = {
    patientId,
    timestamp: new Date().toISOString(),
    heartRate: hr,
    systolic: sys,
    diastolic: dia,
    spo2,
    temperature: temp
  };

  const resource = {
    resourceType: "Observation",
    id: `wear-stream-${patientId}-${Date.now()}`,
    status: "final",
    subject: { reference: `Patient/${patientId}` },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Wearable vital signs" }], text: "Wearable vital signs" },
    valueString: JSON.stringify(v),
    effectiveDateTime: v.timestamp,
    extension: [{ url: "https://medisphere.local/fhir/StructureDefinition/wearable-vitals", valueString: JSON.stringify(v) }]
  };

  const fhirResource = await collectToFhirThenKafka(resource, req.user.sub);
  await audit(req.user.sub, req.user.role, "STREAM_WEARABLE_VITAL_KAFKA", patientId, "SUCCESS", { hr, bp: `${sys}/${dia}` });
  res.status(202).json({
    pipeline: ["COLLECT (Wearables)", "FHIR R4 API", "KAFKA (patient-health-data)", "MONGODB", "DIGITAL HEALTH TWIN"],
    resource: fhirResource,
    vitals: v
  });
}

/**
 * @route POST /api/wearables/vitals
 * @desc Redirect response pointing clients to standard /api/collect/wearable endpoint
 * @access Protected
 */
export function wearablesRedirect(req, res) {
  return res.status(308).json({ message: "Use POST /api/collect/wearable", pipeline: ["COLLECT", "FHIR", "KAFKA", "MONGODB"] });
}
