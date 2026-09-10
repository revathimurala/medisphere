import "dotenv/config";
import mongoose from "mongoose";
import path from "path";
import xlsx from "xlsx";

const uri = process.env.MONGO_URI;
const maskedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@") : "none";

console.log(`\nConnecting to MongoDB Atlas at: ${maskedUri}...`);

const patientSchema = new mongoose.Schema({ fhirId: { type: String, unique: true }, resource: Object, source: String, updatedAt: Date });
const resourceSchema = new mongoose.Schema({ patientId: String, resourceType: String, fhirId: String, resource: Object, source: String, valid: Boolean, receivedAt: Date });
const twinSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },
  demographics: Object,
  conditions: [Object],
  medications: [Object],
  latestVitals: Object,
  wearableVitals: [Object],
  observations: [Object],
  labResults: [Object],
  completeness: Number,
  fhirStatus: String,
  consentStatus: String,
  lastUpdated: Date
}, { collection: "healthtwins", timestamps: true });
const consentSchema = new mongoose.Schema({ patientId: String, providerId: String, purpose: String, status: String, updatedAt: Date });
const auditSchema = new mongoose.Schema({ actor: String, role: String, action: String, patientId: String, result: String, timestamp: Date, metadata: Object });

const Patient = mongoose.model("Patient", patientSchema);
const FHIRResource = mongoose.model("FHIRResource", resourceSchema);
const HealthTwin = mongoose.model("HealthTwin", twinSchema);
const Consent = mongoose.model("Consent", consentSchema);
const AuditLog = mongoose.model("AuditLog", auditSchema);

async function run() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      dbName: process.env.MONGO_DB_NAME || "medisphere",
      autoIndex: false
    });
    console.log(`Connected to MongoDB Atlas: [Database: ${mongoose.connection.name}]`);

    // 1. Seed Patients
    const localPatients = {
      P001: { resourceType: "Patient", id: "P001", name: [{ family: "Doe", given: ["John"] }], gender: "male", birthDate: "1978-04-12" },
      P002: { resourceType: "Patient", id: "P002", name: [{ family: "Roe", given: ["Jane"] }], gender: "female", birthDate: "1985-09-23" },
      P003: { resourceType: "Patient", id: "P003", name: [{ family: "Johnson", given: ["Robert"] }], gender: "male", birthDate: "1962-11-05" },
      P004: { resourceType: "Patient", id: "P004", name: [{ family: "Garcia", given: ["Maria"] }], gender: "female", birthDate: "1991-02-18" },
      P005: { resourceType: "Patient", id: "P005", name: [{ family: "Kim", given: ["David"] }], gender: "male", birthDate: "1973-07-30" }
    };

    console.log("Seeding Patients and Consents...");
    for (const [pid, res] of Object.entries(localPatients)) {
      await Patient.findOneAndUpdate({ fhirId: pid }, { fhirId: pid, resource: res, source: "FHIR/Seed", updatedAt: new Date() }, { upsert: true });
      await Consent.findOneAndUpdate({ patientId: pid }, { patientId: pid, providerId: "dr_smith", purpose: "milestone1-demo", status: "granted", updatedAt: new Date() }, { upsert: true });
    }

    // 2. Read Excel and populate FHIR resources
    const file = path.resolve(process.cwd(), "../data/medisphere_milestone1_demo.xlsx");
    const wb = xlsx.readFile(file);

    const wearableRows = xlsx.utils.sheet_to_json(wb.Sheets["WearableVitals"] || [], { defval: null });
    const labRows = xlsx.utils.sheet_to_json(wb.Sheets["LabResults"] || [], { defval: null });
    const condRows = xlsx.utils.sheet_to_json(wb.Sheets["Conditions"] || [], { defval: null });
    const medRows = xlsx.utils.sheet_to_json(wb.Sheets["Medications"] || [], { defval: null });

    console.log(`Processing ${wearableRows.length} Wearable rows, ${labRows.length} Labs, ${condRows.length} Conditions, ${medRows.length} Medications...`);

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
      await FHIRResource.findOneAndUpdate({ patientId: pid, fhirId: resource.id }, { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Wearable", valid: true, receivedAt: new Date(v.timestamp) }, { upsert: true });
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
      await FHIRResource.findOneAndUpdate({ patientId: pid, fhirId: resource.id }, { patientId: pid, resourceType: "Observation", fhirId: resource.id, resource, source: "FHIR/Lab", valid: true, receivedAt: new Date(r.date || Date.now()) }, { upsert: true });
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
      await FHIRResource.findOneAndUpdate({ patientId: pid, fhirId: resource.id }, { patientId: pid, resourceType: "Condition", fhirId: resource.id, resource, source: "FHIR/Condition", valid: true, receivedAt: new Date() }, { upsert: true });
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
      await FHIRResource.findOneAndUpdate({ patientId: pid, fhirId: resource.id }, { patientId: pid, resourceType: "MedicationRequest", fhirId: resource.id, resource, source: "FHIR/Medication", valid: true, receivedAt: new Date() }, { upsert: true });
    }

    // 3. Build and save HealthTwins in MongoDB Atlas
    console.log("Rebuilding Digital Health Twins in Atlas...");
    for (const pid of ["P001", "P002", "P003", "P004", "P005"]) {
      const [patient, resources, consent] = await Promise.all([
        Patient.findOne({ fhirId: pid }),
        FHIRResource.find({ patientId: pid }),
        Consent.findOne({ patientId: pid, status: "granted" })
      ]);
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

      await HealthTwin.findOneAndUpdate({ patientId: pid }, {
        patientId: pid,
        demographics: { name: patient?.resource?.name?.[0]?.family ? `${patient.resource.name[0].given?.join(" ")} ${patient.resource.name[0].family}` : "Unknown", gender: patient?.resource?.gender, dob: patient?.resource?.birthDate },
        conditions, medications, observations: obsResources.map(r => r.resource), wearableVitals, latestVitals, labResults: labs,
        completeness: 100, fhirStatus: "Valid", consentStatus: consent ? "Granted" : "Not Granted",
        lastUpdated: new Date()
      }, { upsert: true });
    }

    // 4. Print final counts in MongoDB Atlas
    const [pCount, cCount, rCount, tCount] = await Promise.all([
      Patient.countDocuments(),
      Consent.countDocuments(),
      FHIRResource.countDocuments(),
      HealthTwin.countDocuments()
    ]);

    console.log("\n==================================================");
    console.log(" ATLAS SEEDING COMPLETE!");
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(` Patients: ${pCount}`);
    console.log(` Consents: ${cCount}`);
    console.log(` FHIR Resources: ${rCount}`);
    console.log(` Digital Health Twins: ${tCount}`);
    console.log("==================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Atlas seeding failed:", err.message);
    process.exit(1);
  }
}

run();
