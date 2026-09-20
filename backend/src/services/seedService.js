import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import Patient from "../models/Patient.js";
import Consent from "../models/Consent.js";
import FHIRResource from "../models/FHIRResource.js";
import { localFhir } from "./fhirStore.js";
import { rebuildTwin } from "./twinService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedInitialDatabase() {
  console.log("Seeding clinical cohort (P001-P005), consents, and digital twins...");
  const defaultPatients = [
    { fhirId: "P001", resource: { resourceType: "Patient", id: "P001", name: [{ family: "Doe", given: ["John"] }], gender: "male", birthDate: "1978-04-12" }, source: "FHIR/Seed" },
    { fhirId: "P002", resource: { resourceType: "Patient", id: "P002", name: [{ family: "Roe", given: ["Jane"] }], gender: "female", birthDate: "1985-09-23" }, source: "FHIR/Seed" },
    { fhirId: "P003", resource: { resourceType: "Patient", id: "P003", name: [{ family: "Johnson", given: ["Robert"] }], gender: "male", birthDate: "1962-11-05" }, source: "FHIR/Seed" },
    { fhirId: "P004", resource: { resourceType: "Patient", id: "P004", name: [{ family: "Garcia", given: ["Maria"] }], gender: "female", birthDate: "1991-02-18" }, source: "FHIR/Seed" },
    { fhirId: "P005", resource: { resourceType: "Patient", id: "P005", name: [{ family: "Kim", given: ["David"] }], gender: "male", birthDate: "1973-07-30" }, source: "FHIR/Seed" }
  ];

  for (const p of defaultPatients) {
    await Patient.findOneAndUpdate(
      { fhirId: p.fhirId },
      { fhirId: p.fhirId, resource: p.resource, source: p.source, updatedAt: new Date() },
      { upsert: true }
    );
    await Consent.findOneAndUpdate(
      { patientId: p.fhirId },
      { patientId: p.fhirId, providerId: "clinician-demo", purpose: "clinical-care", status: "granted", updatedAt: new Date() },
      { upsert: true }
    );
  }

  // Load excel demo records into FHIRResource if available
  const excelFile = path.resolve(__dirname, "../../../data/medisphere_milestone1_demo.xlsx");
  if (fs.existsSync(excelFile)) {
    try {
      const wb = xlsx.readFile(excelFile);
      const wearableRows = xlsx.utils.sheet_to_json(wb.Sheets["WearableVitals"] || [], { defval: null });
      const labRows = xlsx.utils.sheet_to_json(wb.Sheets["LabResults"] || [], { defval: null });
      const condRows = xlsx.utils.sheet_to_json(wb.Sheets["Conditions"] || [], { defval: null });
      const medRows = xlsx.utils.sheet_to_json(wb.Sheets["Medications"] || [], { defval: null });

      for (const [i, r] of wearableRows.entries()) {
        const pid = String(r.patientId || r.patient || "P001").trim();
        const v = { patientId: pid, timestamp: r.timestamp || new Date().toISOString(), heartRate: Number(r.heartRate), systolic: Number(r.systolic), diastolic: Number(r.diastolic), spo2: Number(r.spo2), temperature: Number(r.temperature) };
        const resource = {
          resourceType: "Observation", id: `wear-${pid}-${i}`, status: "final",
          subject: { reference: `Patient/${pid}` },
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
          code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Wearable vital signs" }], text: "Wearable vital signs" },
          valueString: JSON.stringify(v), effectiveDateTime: v.timestamp,
          extension: [{ url: "https://medisphere.local/fhir/StructureDefinition/wearable-vitals", valueString: JSON.stringify(v) }]
        };
        await FHIRResource.findOneAndUpdate(
          { patientId: pid, fhirId: resource.id },
          { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Wearable", valid: true, receivedAt: new Date(v.timestamp) },
          { upsert: true }
        );
      }

      for (const [i, r] of labRows.entries()) {
        const pid = String(r.patientId || r.patient || "P001").trim();
        const resource = {
          resourceType: "Observation", id: `lab-${pid}-${i}`, status: "final",
          subject: { reference: `Patient/${pid}` },
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
          code: { text: r.test, coding: [{ system: "http://loinc.org", code: "unknown", display: r.test }] },
          valueQuantity: { value: Number(r.value), unit: r.unit || "" }, effectiveDateTime: r.date || new Date().toISOString()
        };
        await FHIRResource.findOneAndUpdate(
          { patientId: pid, fhirId: resource.id },
          { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Lab", valid: true, receivedAt: new Date(r.date || Date.now()) },
          { upsert: true }
        );
      }

      for (const c of condRows) {
        const pid = String(c.patientId || c.patient || "P001").trim();
        const condText = c.condition || c.code;
        const slug = String(condText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
        const resource = {
          resourceType: "Condition", id: `cond-${pid}-${slug}`,
          clinicalStatus: { coding: [{ code: c.clinicalStatus || "active" }] },
          subject: { reference: `Patient/${pid}` },
          code: { text: condText }
        };
        await FHIRResource.findOneAndUpdate(
          { patientId: pid, fhirId: resource.id },
          { patientId: pid, resourceType: "Condition", fhirId: resource.id, resource, source: "FHIR/Condition", valid: true, receivedAt: new Date() },
          { upsert: true }
        );
      }

      for (const m of medRows) {
        const pid = String(m.patientId || m.patient || "P001").trim();
        const medText = m.medication || m.drug || m.name;
        const slug = String(medText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
        const resource = {
          resourceType: "MedicationRequest", id: `med-${pid}-${slug}`,
          status: m.status || "active", intent: "order",
          subject: { reference: `Patient/${pid}` },
          medicationCodeableConcept: { text: m.dosage ? `${medText} (${m.dosage})` : medText }
        };
        await FHIRResource.findOneAndUpdate(
          { patientId: pid, fhirId: resource.id },
          { patientId: pid, resourceType: "MedicationRequest", fhirId: resource.id, resource, source: "FHIR/Medication", valid: true, receivedAt: new Date() },
          { upsert: true }
        );
      }
    } catch (excelErr) {
      console.warn("Excel demo parsing notice:", excelErr.message);
    }
  }

  // Also seed local observations
  for (const obs of (localFhir.Observation || [])) {
    const pid = obs.subject?.reference?.replace("Patient/", "") || "P001";
    await FHIRResource.findOneAndUpdate(
      { patientId: pid, fhirId: obs.id },
      { patientId: pid, resourceType: "Observation", fhirId: obs.id, resource: obs, source: "FHIR/Local", valid: true, receivedAt: new Date() },
      { upsert: true }
    );
  }

  // Rebuild Digital Health Twins for all 5 patients
  for (const pid of ["P001", "P002", "P003", "P004", "P005"]) {
    await rebuildTwin(pid);
  }
  console.log("Seeding complete: All 5 patients, consents, and twins are active & ready!");
}
