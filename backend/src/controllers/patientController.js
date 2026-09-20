import HealthTwin from "../models/HealthTwin.js";
import Patient from "../models/Patient.js";
import { seedInitialDatabase } from "../services/seedService.js";
import { localFhir, patientName } from "../services/fhirStore.js";
import flService from "../services/federatedLearning.js";

/**
 * @route GET /api/patients
 * @desc Retrieves all patients across DB and local FHIR registry with AI risk score predictions and vitals summary
 * @access Protected (Admin, Provider)
 */
export async function getPatients(req, res) {
  let twins = await HealthTwin.find().sort({ lastUpdated: -1 }).limit(100);
  let dbPatients = await Patient.find();

  // Auto-seed cohort database if no patients exist yet
  if (dbPatients.length === 0 || twins.length === 0) {
    try {
      await seedInitialDatabase();
      twins = await HealthTwin.find().sort({ lastUpdated: -1 }).limit(100);
      dbPatients = await Patient.find();
    } catch (e) {
      console.warn("Auto-seed notice in /api/patients:", e.message);
    }
  }

  const twinById = new Map(twins.map(t => [t.patientId, t]));
  const allPatientsMap = new Map();
  for (const p of Object.values(localFhir.Patient)) {
    if (p && p.id) allPatientsMap.set(p.id, p);
  }
  for (const p of dbPatients) {
    if (p.fhirId && p.resource) {
      allPatientsMap.set(p.fhirId, p.resource);
    }
  }

  // Map each patient with digital twin state and ML risk model prediction
  const patients = Array.from(allPatientsMap.values()).map(p => {
    const twin = twinById.get(p.id);
    const pred = flService.getPatientRiskPrediction(p.id, twin, p);
    return {
      id: p.id,
      name: patientName(p),
      gender: p.gender,
      birthDate: p.birthDate,
      twinReady: twinById.has(p.id),
      completeness: twin?.completeness ?? 0,
      riskScore: pred?.prediction?.riskScore || 12.0,
      riskPercentage: pred?.prediction?.percentage || "12.0%",
      riskCategory: pred?.prediction?.category || "Low Risk",
      riskColor: pred?.prediction?.categoryColor || "#10b981",
      recommendation: pred?.recommendation || "Routine care",
      vitalsSummary: twin?.latestVitals ? `BP ${twin.latestVitals.systolic || 120}/${twin.latestVitals.diastolic || 80} · HR ${twin.latestVitals.heartRate || 72}` : null
    };
  });
  
  // Sort high risk patients first so clinicians can prioritize critical interventions
  patients.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
  res.json(patients);
}
