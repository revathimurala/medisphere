import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, "../../../data/medisphere_milestone1_demo.xlsx");

const patients = [
  {
    patientId: "P001",
    familyName: "Doe",
    givenName: "John",
    gender: "male",
    birthDate: "1974-05-16",
    phone: "9000000001",
    mrn: "MRN-P001"
  },
  {
    patientId: "P002",
    familyName: "Miller",
    givenName: "Sarah",
    gender: "female",
    birthDate: "1980-08-21",
    phone: "9000000002",
    mrn: "MRN-P002"
  },
  {
    patientId: "P003",
    familyName: "Kumar",
    givenName: "David",
    gender: "male",
    birthDate: "1968-02-10",
    phone: "9000000003",
    mrn: "MRN-P003"
  },
  {
    patientId: "P004",
    familyName: "Taylor",
    givenName: "Robert",
    gender: "male",
    birthDate: "1992-11-04",
    phone: "9000000004",
    mrn: "MRN-P004"
  },
  {
    patientId: "P005",
    familyName: "Chen",
    givenName: "Emily",
    gender: "female",
    birthDate: "1985-03-29",
    phone: "9000000005",
    mrn: "MRN-P005"
  }
];

const wearableVitals = [
  // P001 - Diabetes & Hypertension monitoring
  { patientId: "P001", timestamp: "2026-09-03T08:30:00Z", heartRate: 80, systolic: 128, diastolic: 82, spo2: 98, temperature: 36.6 },
  { patientId: "P001", timestamp: "2026-09-03T09:00:00Z", heartRate: 82, systolic: 130, diastolic: 85, spo2: 98, temperature: 36.7 },
  { patientId: "P001", timestamp: "2026-09-03T09:15:00Z", heartRate: 86, systolic: 132, diastolic: 86, spo2: 97, temperature: 36.8 },
  { patientId: "P001", timestamp: "2026-09-03T09:30:00Z", heartRate: 79, systolic: 126, diastolic: 82, spo2: 99, temperature: 36.6 },

  // P002 - Hypertension monitoring
  { patientId: "P002", timestamp: "2026-09-03T08:45:00Z", heartRate: 74, systolic: 120, diastolic: 78, spo2: 99, temperature: 36.5 },
  { patientId: "P002", timestamp: "2026-09-03T09:00:00Z", heartRate: 76, systolic: 122, diastolic: 80, spo2: 99, temperature: 36.6 },
  { patientId: "P002", timestamp: "2026-09-03T09:20:00Z", heartRate: 78, systolic: 124, diastolic: 81, spo2: 98, temperature: 36.7 },

  // P003 - Hyperlipidemia & Cardiac check
  { patientId: "P003", timestamp: "2026-09-03T08:50:00Z", heartRate: 70, systolic: 116, diastolic: 76, spo2: 97, temperature: 36.4 },
  { patientId: "P003", timestamp: "2026-09-03T09:00:00Z", heartRate: 72, systolic: 118, diastolic: 78, spo2: 97, temperature: 36.5 },
  { patientId: "P003", timestamp: "2026-09-03T09:30:00Z", heartRate: 75, systolic: 120, diastolic: 79, spo2: 98, temperature: 36.6 },

  // P004 - Active Young Adult
  { patientId: "P004", timestamp: "2026-09-03T08:40:00Z", heartRate: 68, systolic: 114, diastolic: 74, spo2: 99, temperature: 36.5 },
  { patientId: "P004", timestamp: "2026-09-03T09:00:00Z", heartRate: 71, systolic: 115, diastolic: 75, spo2: 99, temperature: 36.6 },

  // P005 - Asthma / Respiratory monitoring
  { patientId: "P005", timestamp: "2026-09-03T08:55:00Z", heartRate: 88, systolic: 122, diastolic: 80, spo2: 96, temperature: 36.8 },
  { patientId: "P005", timestamp: "2026-09-03T09:00:00Z", heartRate: 85, systolic: 120, diastolic: 78, spo2: 96, temperature: 36.7 },
  { patientId: "P005", timestamp: "2026-09-03T09:25:00Z", heartRate: 82, systolic: 118, diastolic: 78, spo2: 97, temperature: 36.7 }
];

const labResults = [
  // P001 - Type 2 Diabetes Panel
  { patientId: "P001", date: "2026-09-02", test: "HbA1c", value: 7.2, unit: "%" },
  { patientId: "P001", date: "2026-09-02", test: "Fasting Blood Glucose", value: 142, unit: "mg/dL" },
  { patientId: "P001", date: "2026-09-02", test: "LDL Cholesterol", value: 120, unit: "mg/dL" },
  { patientId: "P001", date: "2026-09-02", test: "eGFR", value: 65, unit: "mL/min/1.73m2" },
  { patientId: "P001", date: "2026-09-02", test: "Serum Creatinine", value: 1.2, unit: "mg/dL" },

  // P002 - Routine Wellness & Lipid Panel
  { patientId: "P002", date: "2026-09-02", test: "HbA1c", value: 6.1, unit: "%" },
  { patientId: "P002", date: "2026-09-02", test: "Fasting Blood Glucose", value: 108, unit: "mg/dL" },
  { patientId: "P002", date: "2026-09-02", test: "LDL Cholesterol", value: 105, unit: "mg/dL" },
  { patientId: "P002", date: "2026-09-02", test: "HDL Cholesterol", value: 55, unit: "mg/dL" },

  // P003 - Cardiac & Renal Panel
  { patientId: "P003", date: "2026-09-02", test: "LDL Cholesterol", value: 110, unit: "mg/dL" },
  { patientId: "P003", date: "2026-09-02", test: "Total Cholesterol", value: 195, unit: "mg/dL" },
  { patientId: "P003", date: "2026-09-02", test: "Serum Creatinine", value: 1.0, unit: "mg/dL" },
  { patientId: "P003", date: "2026-09-02", test: "eGFR", value: 82, unit: "mL/min/1.73m2" },

  // P004 - Baseline Labs
  { patientId: "P004", date: "2026-09-01", test: "HbA1c", value: 5.4, unit: "%" },
  { patientId: "P004", date: "2026-09-01", test: "Fasting Blood Glucose", value: 92, unit: "mg/dL" },
  { patientId: "P004", date: "2026-09-01", test: "Hemoglobin", value: 15.2, unit: "g/dL" },

  // P005 - Respiratory / General Panel
  { patientId: "P005", date: "2026-09-02", test: "Total IgE", value: 185, unit: "IU/mL" },
  { patientId: "P005", date: "2026-09-02", test: "Eosinophil Count", value: 450, unit: "cells/mcL" },
  { patientId: "P005", date: "2026-09-02", test: "Fasting Blood Glucose", value: 96, unit: "mg/dL" }
];

const conditions = [
  { patientId: "P001", condition: "Type 2 Diabetes Mellitus", clinicalStatus: "active" },
  { patientId: "P001", condition: "Essential Hypertension", clinicalStatus: "active" },
  { patientId: "P002", condition: "Pre-Diabetes", clinicalStatus: "active" },
  { patientId: "P002", condition: "Essential Hypertension", clinicalStatus: "active" },
  { patientId: "P003", condition: "Hyperlipidemia", clinicalStatus: "active" },
  { patientId: "P003", condition: "Mild Chronic Kidney Disease (Stage 2)", clinicalStatus: "active" },
  { patientId: "P004", condition: "Seasonal Allergic Rhinitis", clinicalStatus: "active" },
  { patientId: "P005", condition: "Mild Persistent Asthma", clinicalStatus: "active" }
];

const medicationRequests = [
  { patientId: "P001", medication: "Metformin 500mg Oral Tablet", dosage: "500 mg twice daily", status: "active" },
  { patientId: "P001", medication: "Lisinopril 10mg Oral Tablet", dosage: "10 mg once daily", status: "active" },
  { patientId: "P002", medication: "Amlodipine 5mg Oral Tablet", dosage: "5 mg once daily", status: "active" },
  { patientId: "P003", medication: "Atorvastatin 20mg Oral Tablet", dosage: "20 mg once daily at bedtime", status: "active" },
  { patientId: "P005", medication: "Albuterol Inhaler 90mcg", dosage: "2 puffs every 4-6 hours as needed", status: "active" },
  { patientId: "P005", medication: "Fluticasone Propionate Inhaler 110mcg", dosage: "1 puff twice daily", status: "active" }
];

const consents = [
  { patientId: "P001", providerId: "clinician-demo", purpose: "milestone1-demo", status: "granted" },
  { patientId: "P002", providerId: "clinician-demo", purpose: "milestone1-demo", status: "granted" },
  { patientId: "P003", providerId: "clinician-demo", purpose: "milestone1-demo", status: "granted" },
  { patientId: "P004", providerId: "clinician-demo", purpose: "milestone1-demo", status: "granted" },
  { patientId: "P005", providerId: "clinician-demo", purpose: "milestone1-demo", status: "granted" }
];

const wb = xlsx.utils.book_new();

xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(patients), "Patients");
xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(wearableVitals), "WearableVitals");
xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(labResults), "LabResults");
xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(conditions), "Conditions");
xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(medicationRequests), "Medications");
xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(consents), "Consents");

xlsx.writeFile(wb, targetPath);
console.log(`Generated rich demo Excel workbook successfully at: ${targetPath}`);
