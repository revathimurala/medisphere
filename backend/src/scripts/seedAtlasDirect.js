import "dotenv/config";
import { MongoClient } from "mongodb";
import path from "path";
import xlsx from "xlsx";

const uri = process.env.MONGO_URI;
const maskedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@") : "none";

console.log(`Connecting directly to MongoDB Atlas at: ${maskedUri}...`);

async function seed() {
  const client = new MongoClient(uri, { tls: true, directConnection: true, serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME || "medisphere");
    console.log(` Connected to MongoDB Atlas Database: "${db.databaseName}"`);

    // 1. Seed Patients
    const patients = [
      { fhirId: "P001", resource: { resourceType: "Patient", id: "P001", name: [{ family: "Doe", given: ["John"] }], gender: "male", birthDate: "1978-04-12" }, source: "FHIR/Seed", updatedAt: new Date() },
      { fhirId: "P002", resource: { resourceType: "Patient", id: "P002", name: [{ family: "Roe", given: ["Jane"] }], gender: "female", birthDate: "1985-09-23" }, source: "FHIR/Seed", updatedAt: new Date() },
      { fhirId: "P003", resource: { resourceType: "Patient", id: "P003", name: [{ family: "Johnson", given: ["Robert"] }], gender: "male", birthDate: "1962-11-05" }, source: "FHIR/Seed", updatedAt: new Date() },
      { fhirId: "P004", resource: { resourceType: "Patient", id: "P004", name: [{ family: "Garcia", given: ["Maria"] }], gender: "female", birthDate: "1991-02-18" }, source: "FHIR/Seed", updatedAt: new Date() },
      { fhirId: "P005", resource: { resourceType: "Patient", id: "P005", name: [{ family: "Kim", given: ["David"] }], gender: "male", birthDate: "1973-07-30" }, source: "FHIR/Seed", updatedAt: new Date() }
    ];

    console.log("Writing 5 patients to 'patients' collection...");
    for (const p of patients) {
      await db.collection("patients").updateOne({ fhirId: p.fhirId }, { $set: p }, { upsert: true });
    }

    // 2. Seed Consents
    console.log("Writing consents to 'consents' collection...");
    for (const pid of ["P001", "P002", "P003", "P004", "P005"]) {
      await db.collection("consents").updateOne(
        { patientId: pid },
        { $set: { patientId: pid, providerId: "dr_smith", purpose: "milestone1-demo", status: "granted", updatedAt: new Date() } },
        { upsert: true }
      );
    }

    // 3. Read Excel workbook and write FHIR resources
    const file = path.resolve(process.cwd(), "../data/medisphere_milestone1_demo.xlsx");
    const wb = xlsx.readFile(file);

    const wearableRows = xlsx.utils.sheet_to_json(wb.Sheets["WearableVitals"] || [], { defval: null });
    const labRows = xlsx.utils.sheet_to_json(wb.Sheets["LabResults"] || [], { defval: null });
    const condRows = xlsx.utils.sheet_to_json(wb.Sheets["Conditions"] || [], { defval: null });
    const medRows = xlsx.utils.sheet_to_json(wb.Sheets["Medications"] || [], { defval: null });

    console.log(`Writing ${wearableRows.length} Wearables, ${labRows.length} Labs, ${condRows.length} Conditions, ${medRows.length} Medications to 'fhirresources'...`);

    for (const [i, r] of wearableRows.entries()) {
      const pid = String(r.patientId || r.patient).trim();
      const v = { patientId: pid, timestamp: r.timestamp || new Date().toISOString(), heartRate: Number(r.heartRate), systolic: Number(r.systolic), diastolic: Number(r.diastolic), spo2: Number(r.spo2), temperature: Number(r.temperature) };
      const resource = {
        resourceType: "Observation", id: `wear-${pid}-${i}`, status: "final",
        subject: { reference: `Patient/${pid}` },
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Wearable vital signs" }], text: "Wearable vital signs" },
        valueString: JSON.stringify(v), effectiveDateTime: v.timestamp,
        extension: [{ url: "https://medisphere.local/fhir/StructureDefinition/wearable-vitals", valueString: JSON.stringify(v) }]
      };
      await db.collection("fhirresources").updateOne({ patientId: pid, fhirId: resource.id }, { $set: { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Wearable", valid: true, receivedAt: new Date(v.timestamp) } }, { upsert: true });
    }

    for (const [i, r] of labRows.entries()) {
      const pid = String(r.patientId || r.patient).trim();
      const resource = {
        resourceType: "Observation", id: `lab-${pid}-${i}`, status: "final",
        subject: { reference: `Patient/${pid}` },
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
        code: { text: r.test, coding: [{ system: "http://loinc.org", code: "unknown", display: r.test }] },
        valueQuantity: { value: Number(r.value), unit: r.unit || "" }, effectiveDateTime: r.date || new Date().toISOString()
      };
      await db.collection("fhirresources").updateOne({ patientId: pid, fhirId: resource.id }, { $set: { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Lab", valid: true, receivedAt: new Date(r.date || Date.now()) } }, { upsert: true });
    }

    for (const c of condRows) {
      const pid = String(c.patientId || c.patient).trim();
      const condText = c.condition || c.code;
      const slug = String(condText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
      const resource = {
        resourceType: "Condition", id: `cond-${pid}-${slug}`,
        clinicalStatus: { coding: [{ code: c.clinicalStatus || "active" }] },
        subject: { reference: `Patient/${pid}` },
        code: { text: condText }
      };
      await db.collection("fhirresources").updateOne({ patientId: pid, fhirId: resource.id }, { $set: { patientId: pid, resourceType: "Condition", fhirId: resource.id, resource, source: "FHIR/Condition", valid: true, receivedAt: new Date() } }, { upsert: true });
    }

    for (const m of medRows) {
      const pid = String(m.patientId || m.patient).trim();
      const medText = m.medication || m.drug || m.name;
      const slug = String(medText).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
      const resource = {
        resourceType: "MedicationRequest", id: `med-${pid}-${slug}`,
        status: m.status || "active", intent: "order",
        subject: { reference: `Patient/${pid}` },
        medicationCodeableConcept: { text: m.dosage ? `${medText} (${m.dosage})` : medText }
      };
      await db.collection("fhirresources").updateOne({ patientId: pid, fhirId: resource.id }, { $set: { patientId: pid, resourceType: "MedicationRequest", fhirId: resource.id, resource, source: "FHIR/Medication", valid: true, receivedAt: new Date() } }, { upsert: true });
    }

    // 4. Build Digital Health Twins directly in 'healthtwins' collection
    console.log("Building Digital Health Twins in 'healthtwins' collection...");
    for (const pid of ["P001", "P002", "P003", "P004", "P005"]) {
      const patient = await db.collection("patients").findOne({ fhirId: pid });
      const resources = await db.collection("fhirresources").find({ patientId: pid }).toArray();
      const consent = await db.collection("consents").findOne({ patientId: pid, status: "granted" });

      const obsResources = resources.filter(r => r.resourceType === "Observation");
      const wearableResources = obsResources.filter(r => r.resource?.extension?.some(e => e.url?.includes("wearable-vitals")));
      const wearableVitals = wearableResources.map(r => {
        try { return JSON.parse(r.resource.extension.find(e => e.url.includes("wearable-vitals"))?.valueString || "{}"); } catch { return {}; }
      });
      const labs = obsResources.filter(r => r.resource?.category?.[0]?.coding?.[0]?.code === "laboratory").map(r => ({
        fhirId: r.resource.id, code: r.resource.code?.text || "Lab", value: r.resource.valueQuantity?.value, unit: r.resource.valueQuantity?.unit || "", effective: r.resource.effectiveDateTime
      }));
      const conditions = resources.filter(r => r.resourceType === "Condition").map(r => r.resource);
      const medications = resources.filter(r => r.resourceType === "MedicationRequest").map(r => r.resource);
      const latestVitals = wearableVitals.length ? wearableVitals[wearableVitals.length - 1] : null;

      const twin = {
        patientId: pid,
        demographics: {
          name: patient?.resource?.name?.[0] ? `${patient.resource.name[0].given?.join(" ")} ${patient.resource.name[0].family}` : "Patient " + pid,
          gender: patient?.resource?.gender,
          dob: patient?.resource?.birthDate
        },
        conditions, medications, observations: obsResources.map(r => r.resource), wearableVitals, latestVitals, labResults: labs,
        completeness: 100, fhirStatus: "Valid", consentStatus: consent ? "Granted" : "Not Granted",
        lastUpdated: new Date()
      };

      await db.collection("healthtwins").updateOne({ patientId: pid }, { $set: twin }, { upsert: true });
    }

    // 5. Verification Counts
    const pCount = await db.collection("patients").countDocuments();
    const cCount = await db.collection("consents").countDocuments();
    const rCount = await db.collection("fhirresources").countDocuments();
    const tCount = await db.collection("healthtwins").countDocuments();

    console.log("\n=======================================================");
    console.log(" SUCCESS: MONGODB ATLAS IS FULLY POPULATED!");
    console.log(` Database Name:          ${db.databaseName}`);
    console.log(` 'patients' count:       ${pCount}`);
    console.log(` 'consents' count:       ${cCount}`);
    console.log(` 'fhirresources' count:  ${rCount}`);
    console.log(` 'healthtwins' count:    ${tCount}`);
    console.log("=======================================================\n");

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error(" Direct Atlas seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
