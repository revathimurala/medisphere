import Consent from "../models/Consent.js";
import { fhirGet, bundleEntries } from "../services/fhirStore.js";
import { publishFhirToKafka } from "../services/twinService.js";
import audit from "../services/auditService.js";

/**
 * @route POST /api/fhir/sync/:patientId
 * @desc Synchronizes FHIR patient records and observations from external/local EHR server through Kafka into MongoDB Twin
 * @access Protected (Admin, Provider)
 */
export async function syncPatient(req, res) {
  const patientId = req.params.patientId;
  try {
    // 1. Fetch Patient and Observations from FHIR server
    const patient = await fhirGet(`/Patient/${encodeURIComponent(patientId)}`);
    const observations = bundleEntries(await fhirGet(`/Observation?patient=${encodeURIComponent(patientId)}&_count=100`));
    
    // 2. Publish records through Kafka message bus to MongoDB consumer
    await publishFhirToKafka(patient, "FHIR_SYNC", req.user.sub);
    for (const resource of observations) {
      await publishFhirToKafka(resource, "FHIR_SYNC", req.user.sub);
    }
    
    // 3. Upsert default consent and write HIPAA audit event
    await Consent.findOneAndUpdate(
      { patientId },
      { patientId, providerId: req.user.sub, purpose: "milestone1-demo", status: "granted", updatedAt: new Date() },
      { upsert: true }
    );
    await audit(req.user.sub, req.user.role, "FHIR_TO_KAFKA", patientId, "SUCCESS", { count: 1 + observations.length });
    
    res.json({
      pipeline: ["FHIR R4 API", "KAFKA", "MONGODB", "DIGITAL HEALTH TWIN"],
      patient,
      counts: { observations: observations.length },
      queued: 1 + observations.length
    });
  } catch (e) {
    await audit(req.user.sub, req.user.role, "FHIR_TO_KAFKA", patientId, "FAILED", { error: e.message });
    res.status(502).json({ message: "FHIR integration failed", detail: e.response?.data || e.message });
  }
}
