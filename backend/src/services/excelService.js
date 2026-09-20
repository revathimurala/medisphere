import xlsx from "xlsx";
import Patient from "../models/Patient.js";
import Consent from "../models/Consent.js";
import { localFhir } from "./fhirStore.js";
import { publishFhirToKafka, collectToFhirThenKafka, validateVitals, rebuildTwin } from "./twinService.js";
import audit from "./auditService.js";

export async function processExcelWorkbook(wb, actor = "system") {
  const findSheet = (names) => {
    for (const n of names) {
      if (wb.Sheets[n]) return wb.Sheets[n];
    }
    const lowerNames = names.map(x => x.toLowerCase());
    for (const key of wb.SheetNames) {
      if (lowerNames.includes(key.toLowerCase())) return wb.Sheets[key];
    }
    return null;
  };

  const rows = (names) => {
    const sheet = findSheet(Array.isArray(names) ? names : [names]);
    if (!sheet) return [];
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
  };

  const patientRows = rows(["Patients", "Patient", "Demographics"]);
  const consentRows = rows(["Consents", "Consent"]);
  const conditionRows = rows(["Conditions", "Condition"]);
  const medRows = rows(["Medications", "MedicationRequests", "Medication"]);
  const wearableRows = rows(["WearableVitals", "Wearables", "Vitals"]);
  const labRows = rows(["LabResults", "Labs", "LaboratoryReports"]);

  const affectedPatientIds = new Set();
  let queued = 0;

  // 1. Process explicit Patients sheet
  for (const p of patientRows) {
    if (!p.patientId && !p.id) continue;
    const pid = String(p.patientId || p.id).trim();
    affectedPatientIds.add(pid);
    const family = p.familyName || p.family || p.lastName || "";
    const given = p.givenName || p.given || p.firstName || "";
    const resource = {
      resourceType: "Patient",
      id: pid,
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [{ system: "https://medisphere.local/mrn", value: p.mrn || `MRN-${pid}` }],
      active: true,
      name: [{ use: "official", family, given: [given].filter(Boolean) }],
      gender: p.gender || "unknown",
      birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "1980-01-01",
      telecom: p.phone ? [{ system: "phone", value: String(p.phone) }] : []
    };
    localFhir.Patient[pid] = resource;
    await publishFhirToKafka(resource, "FHIR_PATIENT", actor);
    queued++;
  }

  // Collect patient IDs mentioned across all other sheets
  for (const r of [...wearableRows, ...labRows, ...conditionRows, ...medRows, ...consentRows]) {
    const pid = r.patientId || r.patient || r.id;
    if (pid) affectedPatientIds.add(String(pid).trim());
  }

  // Ensure every patient exists in local registry and database
  for (const pid of affectedPatientIds) {
    if (!localFhir.Patient[pid]) {
      const existing = await Patient.findOne({ fhirId: pid });
      if (existing?.resource) {
        localFhir.Patient[pid] = existing.resource;
      } else {
        const fallback = {
          resourceType: "Patient",
          id: pid,
          meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
          identifier: [{ system: "https://medisphere.local/mrn", value: `MRN-${pid}` }],
          active: true,
          name: [{ use: "official", family: pid, given: ["Patient"] }],
          gender: "unknown",
          birthDate: "1980-01-01"
        };
        localFhir.Patient[pid] = fallback;
        await publishFhirToKafka(fallback, "FHIR_PATIENT", actor, false);
        queued++;
      }
    }
  }

  // 2. Process Consents
  for (const c of consentRows) {
    const pid = c.patientId || c.patient || c.id;
    if (!pid) continue;
    const cleanId = String(pid).trim();
    await Consent.findOneAndUpdate(
      { patientId: cleanId },
      {
        patientId: cleanId,
        providerId: c.providerId || actor,
        purpose: c.purpose || "milestone1-demo",
        status: c.status || "granted",
        updatedAt: new Date()
      },
      { upsert: true }
    );
  }

  // Ensure default consent for any patient who doesn't have one
  for (const pid of affectedPatientIds) {
    const existing = await Consent.findOne({ patientId: pid });
    if (!existing) {
      await Consent.create({
        patientId: pid,
        providerId: actor,
        purpose: "milestone1-demo",
        status: "granted"
      });
    }
  }

  // 3. Process Conditions
  for (const c of conditionRows) {
    const pid = c.patientId || c.patient;
    if (!pid || (!c.condition && !c.code)) continue;
    const cleanId = String(pid).trim();
    const condText = c.condition || c.code;
    const slug = String(condText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
    const resource = {
      resourceType: "Condition",
      id: `cond-${cleanId}-${slug}`,
      clinicalStatus: { coding: [{ code: c.clinicalStatus || "active" }] },
      subject: { reference: `Patient/${cleanId}` },
      code: { text: condText }
    };
    await publishFhirToKafka(resource, "FHIR_CONDITION", actor, false);
    queued++;
  }

  // 4. Process Medications
  for (const m of medRows) {
    const pid = m.patientId || m.patient;
    if (!pid || (!m.medication && !m.drug && !m.name)) continue;
    const cleanId = String(pid).trim();
    const medText = m.medication || m.drug || m.name;
    const slug = String(medText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
    const resource = {
      resourceType: "MedicationRequest",
      id: `med-${cleanId}-${slug}`,
      status: m.status || "active",
      intent: "order",
      subject: { reference: `Patient/${cleanId}` },
      medicationCodeableConcept: { text: m.dosage ? `${medText} (${m.dosage})` : medText }
    };
    await publishFhirToKafka(resource, "FHIR_MEDICATION", actor, false);
    queued++;
  }

  // 5. Process Wearable Vitals
  for (const r of wearableRows) {
    const pid = r.patientId || r.patient;
    if (!pid) continue;
    const cleanId = String(pid).trim();
    const v = {
      patientId: cleanId,
      timestamp: r.timestamp || new Date().toISOString(),
      heartRate: Number(r.heartRate),
      systolic: Number(r.systolic),
      diastolic: Number(r.diastolic),
      spo2: Number(r.spo2),
      temperature: Number(r.temperature)
    };
    if (!validateVitals(v)) continue;
    const resource = {
      resourceType: "Observation",
      id: `wear-${cleanId}-${Date.now()}-${queued}`,
      status: "final",
      subject: { reference: `Patient/${cleanId}` },
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
      code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Wearable vital signs" }], text: "Wearable vital signs" },
      valueString: JSON.stringify(v),
      effectiveDateTime: v.timestamp,
      extension: [{ url: "https://medisphere.local/fhir/StructureDefinition/wearable-vitals", valueString: JSON.stringify(v) }]
    };
    await collectToFhirThenKafka(resource, actor, false);
    queued++;
  }

  // 6. Process Lab Results
  for (const r of labRows) {
    const pid = r.patientId || r.patient;
    if (!pid || !r.test || r.value === null || r.value === undefined || Number.isNaN(Number(r.value))) continue;
    const cleanId = String(pid).trim();
    const resource = {
      resourceType: "Observation",
      id: `lab-${cleanId}-${Date.now()}-${queued}`,
      status: "final",
      subject: { reference: `Patient/${cleanId}` },
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
      code: { text: r.test, coding: [{ system: "http://loinc.org", code: "unknown", display: r.test }] },
      valueQuantity: { value: Number(r.value), unit: r.unit || "" },
      effectiveDateTime: r.date || new Date().toISOString()
    };
    await collectToFhirThenKafka(resource, actor, false);
    queued++;
  }

  // Rebuild twin for all affected patients
  for (const pid of affectedPatientIds) {
    await rebuildTwin(pid);
  }

  await audit(actor, "provider", "EXCEL_COLLECTION_PIPELINE", null, "SUCCESS", {
    patients: patientRows.length,
    wearables: wearableRows.length,
    labs: labRows.length,
    conditions: conditionRows.length,
    medications: medRows.length,
    consents: consentRows.length,
    queued
  });

  return {
    pipeline: ["1. COLLECT DATA", "2. FHIR R4 API", "3. KAFKA", "4. MONGODB", "5. DIGITAL HEALTH TWIN"],
    patients: patientRows.length || affectedPatientIds.size,
    wearables: wearableRows.length,
    laboratoryReports: labRows.length,
    conditions: conditionRows.length,
    medications: medRows.length,
    consents: consentRows.length,
    queued,
    patientIds: Array.from(affectedPatientIds)
  };
}
