import { Fhir } from "fhir";
import axios from "axios";

export const fhirEngine = new Fhir();

export const localFhir = {
  Patient: {
    "P001": {
      resourceType: "Patient", id: "P001",
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [{ system: "https://medisphere.local/mrn", value: "MRN-P001" }],
      active: true,
      name: [{ use: "official", family: "Doe", given: ["John"] }],
      gender: "male", birthDate: "1974-05-16",
      telecom: [{ system: "phone", value: "9000000001" }]
    },
    "P002": {
      resourceType: "Patient", id: "P002",
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [{ system: "https://medisphere.local/mrn", value: "MRN-P002" }],
      active: true,
      name: [{ use: "official", family: "Miller", given: ["Sarah"] }],
      gender: "female", birthDate: "1980-08-21",
      telecom: [{ system: "phone", value: "9000000002" }]
    },
    "P003": {
      resourceType: "Patient", id: "P003",
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [{ system: "https://medisphere.local/mrn", value: "MRN-P003" }],
      active: true,
      name: [{ use: "official", family: "Kumar", given: ["David"] }],
      gender: "male", birthDate: "1968-02-10",
      telecom: [{ system: "phone", value: "9000000003" }]
    },
    "P004": {
      resourceType: "Patient", id: "P004",
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [{ system: "https://medisphere.local/mrn", value: "MRN-P004" }],
      active: true,
      name: [{ use: "official", family: "Taylor", given: ["Robert"] }],
      gender: "male", birthDate: "1992-11-04",
      telecom: [{ system: "phone", value: "9000000004" }]
    }
  },
  Observation: [
    {resourceType:"Observation",id:"OBS-P001-HR",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"vital-signs"}]}],
      code:{coding:[{system:"http://loinc.org",code:"8867-4",display:"Heart rate"}],text:"Heart rate"},
      valueQuantity:{value:82,unit:"beats/minute",system:"http://unitsofmeasure.org",code:"/min"},
      effectiveDateTime:"2026-09-03T09:00:00Z"},
    {resourceType:"Observation",id:"OBS-P001-BP",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"vital-signs"}]}],
      code:{coding:[{system:"http://loinc.org",code:"85354-9",display:"Blood pressure"}],text:"Blood pressure"},
      component:[
        {code:{coding:[{system:"http://loinc.org",code:"8480-6",display:"Systolic blood pressure"}]},valueQuantity:{value:130,unit:"mmHg"}},
        {code:{coding:[{system:"http://loinc.org",code:"8462-4",display:"Diastolic blood pressure"}]},valueQuantity:{value:85,unit:"mmHg"}}
      ],effectiveDateTime:"2026-09-03T09:00:00Z"},
    {resourceType:"Observation",id:"OBS-P001-SPO2",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"vital-signs"}]}],
      code:{coding:[{system:"http://loinc.org",code:"59408-5",display:"Oxygen saturation"}],text:"SpO2"},
      valueQuantity:{value:98,unit:"%",system:"http://unitsofmeasure.org",code:"%"},
      effectiveDateTime:"2026-09-03T09:00:00Z"},
    {resourceType:"Observation",id:"OBS-P001-HBA1C",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"laboratory"}]}],
      code:{coding:[{system:"http://loinc.org",code:"4548-4",display:"Hemoglobin A1c"}],text:"HbA1c"},
      valueQuantity:{value:7.2,unit:"%",system:"http://unitsofmeasure.org",code:"%"},
      effectiveDateTime:"2026-09-02"},
    {resourceType:"Observation",id:"OBS-P001-EGFR",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"laboratory"}]}],
      code:{coding:[{system:"http://loinc.org",code:"62238-1",display:"eGFR"}],text:"eGFR"},
      valueQuantity:{value:65,unit:"mL/min/1.73m2"},
      effectiveDateTime:"2026-09-02"},
    {resourceType:"Observation",id:"OBS-P001-LDL",status:"final",subject:{reference:"Patient/P001"},
      category:[{coding:[{system:"http://terminology.hl7.org/CodeSystem/observation-category",code:"laboratory"}]}],
      code:{coding:[{system:"http://loinc.org",code:"13457-7",display:"LDL cholesterol"}],text:"LDL"},
      valueQuantity:{value:120,unit:"mg/dL"}, effectiveDateTime:"2026-09-02"},

    {resourceType:"Observation",id:"OBS-P002-HR",status:"final",subject:{reference:"Patient/P002"},
      code:{coding:[{system:"http://loinc.org",code:"8867-4",display:"Heart rate"}],text:"Heart rate"},
      valueQuantity:{value:76,unit:"beats/minute"},effectiveDateTime:"2026-09-03T09:00:00Z"},
    {resourceType:"Observation",id:"OBS-P002-HBA1C",status:"final",subject:{reference:"Patient/P002"},
      code:{coding:[{system:"http://loinc.org",code:"4548-4",display:"Hemoglobin A1c"}],text:"HbA1c"},
      valueQuantity:{value:6.1,unit:"%"},effectiveDateTime:"2026-09-02"},
    {resourceType:"Observation",id:"OBS-P003-HR",status:"final",subject:{reference:"Patient/P003"},
      code:{coding:[{system:"http://loinc.org",code:"8867-4",display:"Heart rate"}],text:"Heart rate"},
      valueQuantity:{value:72,unit:"beats/minute"},effectiveDateTime:"2026-09-03T09:00:00Z"},
    {resourceType:"Observation",id:"OBS-P003-LDL",status:"final",subject:{reference:"Patient/P003"},
      code:{coding:[{system:"http://loinc.org",code:"13457-7",display:"LDL cholesterol"}],text:"LDL"},
      valueQuantity:{value:110,unit:"mg/dL"},effectiveDateTime:"2026-09-02"}
  ],
  Condition: [
    {resourceType:"Condition",id:"COND-P001-DM",clinicalStatus:{coding:[{code:"active"}]},
      subject:{reference:"Patient/P001"},code:{text:"Type 2 Diabetes Mellitus"}},
    {resourceType:"Condition",id:"COND-P001-HTN",clinicalStatus:{coding:[{code:"active"}]},
      subject:{reference:"Patient/P001"},code:{text:"Hypertension"}},
    {resourceType:"Condition",id:"COND-P002-HTN",clinicalStatus:{coding:[{code:"active"}]},
      subject:{reference:"Patient/P002"},code:{text:"Hypertension"}},
    {resourceType:"Condition",id:"COND-P003-HL",clinicalStatus:{coding:[{code:"active"}]},
      subject:{reference:"Patient/P003"},code:{text:"Hyperlipidemia"}}
  ],
  MedicationRequest: [
    {resourceType:"MedicationRequest",id:"MED-P001-MET",status:"active",intent:"order",
      subject:{reference:"Patient/P001"},medicationCodeableConcept:{text:"Metformin 500mg"}},
    {resourceType:"MedicationRequest",id:"MED-P001-LIS",status:"active",intent:"order",
      subject:{reference:"Patient/P001"},medicationCodeableConcept:{text:"Lisinopril 10mg"}},
    {resourceType:"MedicationRequest",id:"MED-P002-AM",status:"active",intent:"order",
      subject:{reference:"Patient/P002"},medicationCodeableConcept:{text:"Amlodipine 5mg"}},
    {resourceType:"MedicationRequest",id:"MED-P003-AT",status:"active",intent:"order",
      subject:{reference:"Patient/P003"},medicationCodeableConcept:{text:"Atorvastatin 20mg"}}
  ],
  DiagnosticReport: [
    {resourceType:"DiagnosticReport",id:"DR-P001-001",status:"final",
      subject:{reference:"Patient/P001"},code:{text:"Routine laboratory report"},
      conclusion:"HbA1c 7.2%, eGFR 65, LDL 120 mg/dL",effectiveDateTime:"2026-09-02"},
    {resourceType:"DiagnosticReport",id:"DR-P002-001",status:"final",
      subject:{reference:"Patient/P002"},code:{text:"Routine laboratory report"},
      conclusion:"HbA1c 6.1%",effectiveDateTime:"2026-09-02"},
    {resourceType:"DiagnosticReport",id:"DR-P003-001",status:"final",
      subject:{reference:"Patient/P003"},code:{text:"Routine laboratory report"},
      conclusion:"LDL 110 mg/dL",effectiveDateTime:"2026-09-02"}
  ]
};

export const collectedFhir = { Observation: [], DiagnosticReport: [] };

export function addCollectedFhir(resource) {
  const type = resource.resourceType;
  if (!collectedFhir[type]) collectedFhir[type] = [];
  const idx = collectedFhir[type].findIndex(r => r.id === resource.id);
  if (idx >= 0) collectedFhir[type][idx] = resource;
  else collectedFhir[type].push(resource);
  return resource;
}

export function collectedResource(type, id) {
  return (collectedFhir[type] || []).find(r => r.id === id) || null;
}

export function allFhirResources(type) {
  if (type === "Patient") return Object.values(localFhir.Patient);
  return [...(localFhir[type] || []), ...(collectedFhir[type] || [])];
}

export function fhirBundle(resources, type) {
  const port = Number(process.env.PORT || 4000);
  return {
    resourceType: "Bundle",
    id: `bundle-${type.toLowerCase()}-${Date.now()}`,
    type: "searchset",
    total: resources.length,
    entry: resources.map(resource => ({
      fullUrl: `http://localhost:${port}/fhir/R4/${resource.resourceType}/${resource.id}`,
      resource
    }))
  };
}

export function localFhirResource(type, id) {
  if (type === "Patient") return localFhir.Patient[id] || null;
  return collectedResource(type, id) || (localFhir[type] || []).find(r => r.id === id) || null;
}

export function localFhirSearch(type, patientId) {
  if (type === "Patient") return Object.values(localFhir.Patient).filter(p => !patientId || p.id === patientId);
  return allFhirResources(type).filter(r => !patientId || r.subject?.reference === `Patient/${patientId}`);
}

export function patientName(resource) {
  const n = resource?.name?.[0];
  return n ? [...(n.given || []), n.family || ""].join(" ").trim() : "Unknown";
}

export function bundleEntries(bundle) {
  return (bundle?.entry || []).map(x => x.resource).filter(Boolean);
}

export function validateFhirResource(resource) {
  if (!resource || typeof resource !== "object") return false;
  if (!resource.resourceType || !resource.id) return false;
  if (["Observation", "DiagnosticReport", "Condition", "MedicationRequest"].includes(resource.resourceType) &&
      !resource.subject?.reference) return false;
  if (resource.resourceType === "Observation" && !resource.code) return false;
  const validation = fhirEngine.validate(resource);
  return validation.valid;
}

export function extractQuantity(o) {
  return o?.valueQuantity?.value ?? o?.value?.value ?? null;
}

export function mapObservation(o) {
  return {
    fhirId: o.id,
    code: o.code?.text || o.code?.coding?.[0]?.display || "Observation",
    value: extractQuantity(o),
    unit: o.valueQuantity?.unit || "",
    effective: o.effectiveDateTime || o.effectivePeriod?.start || null,
    raw: o
  };
}

export async function fhirToken(scope = process.env.FHIR_SCOPE || "user/*.read") {
  if (!process.env.FHIR_TOKEN_URL || !process.env.FHIR_CLIENT_ID || !process.env.FHIR_CLIENT_SECRET) return null;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.FHIR_CLIENT_ID,
    client_secret: process.env.FHIR_CLIENT_SECRET,
    scope
  });
  const r = await axios.post(process.env.FHIR_TOKEN_URL, body.toString(), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  return r.data.access_token;
}

export async function fhirGet(path) {
  if (!process.env.FHIR_BASE_URL) {
    const [resourcePath] = path.split("?");
    const match = resourcePath.match(/^\/(Patient|Observation)\/(.+)$/);
    if (match) {
      const resource = localFhirResource(match[1], decodeURIComponent(match[2]));
      if (!resource) throw new Error(`FHIR resource not found: ${resourcePath}`);
      return resource;
    }
    const search = resourcePath.match(/^\/(Patient|Observation)$/);
    if (search) {
      const query = new URLSearchParams(path.split("?")[1] || "");
      return fhirBundle(localFhirSearch(search[1], query.get("patient")), search[1]);
    }
    throw new Error(`Unsupported local FHIR path: ${path}`);
  }
  const token = await fhirToken("user/*.read");
  const headers = { Accept: "application/fhir+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return (await axios.get(`${process.env.FHIR_BASE_URL}${path}`, { headers, timeout: 20000 })).data;
}

export async function fhirPost(resourceType, resource) {
  if (!process.env.FHIR_BASE_URL) {
    if (resource.resourceType !== resourceType || !validateFhirResource(resource)) {
      throw new Error("Invalid local FHIR resource");
    }
    return addCollectedFhir(resource);
  }
  const token = await fhirToken("user/*.write");
  const headers = { Accept: "application/fhir+json", "Content-Type": "application/fhir+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return (await axios.post(`${process.env.FHIR_BASE_URL}/${resourceType}`, resource, { headers, timeout: 20000 })).data;
}
