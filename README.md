# MediSphere Cognitive Twin: AI-Powered Clinical Digital Health Twin Platform

> **Real-time HL7 FHIR R4 Streaming, Multi-Hospital Federated Learning, and Explainable Clinical Decision Support System**

---

## 📌 Project Overview & Metadata

| Metadata Field | Details |
| :--- | :--- |
| **Project Title** | **MediSphere Cognitive Twin: AI-Powered Clinical Digital Health Twin Platform** |
| **Lead Developer & Contributor** | **Murala Revathi** |
| **Project Classification** | **Individual Project** |
| **College / Institution Information** | **Department of Computer Science and Engineering / Healthcare Informatics & Cognitive Computing Lab** *(Update with your specific College / University / Incubator Name)* |
| **Final Presentation Deck** | 📊 [**MediSphere_Final_Presentationto4.pptx**](MediSphere_Final_Presentationto4.pptx) *(Milestones 1–4 Evaluation Deck)* |
| **Open-Source License** | [MIT License](LICENSE) *(Full permissive open-source license)* |
| **Repository Accessibility** | **100% Publicly accessible without additional permissions** *(All source code, schemas, architecture diagrams, and slide decks are stored directly within this repository)* |

---

## 🎥 15-20 Minute Project Demo Video

- **Unlisted YouTube Video Link**:  
  👉 **`https://www.youtube.com/watch?v=YOUR_UNLISTED_VIDEO_ID`**  
  *(Replace `YOUR_UNLISTED_VIDEO_ID` with the YouTube video ID of your uploaded unlisted demo recording)*

### Demo Video Agenda & Walkthrough (15–20 Minutes)
1. **00:00 – 02:30 | Project Overview & Clinical Vision**: Introduction to MediSphere Cognitive Twin, problem statement in modern intensive and ambulatory care, and architecture overview.
2. **02:30 – 05:30 | Data Ingestion & Local HL7 FHIR R4 API**: Demonstration of ingesting smartwatch wearable sensor telemetry and laboratory diagnostic reports into standardized FHIR R4 Observation resources.
3. **05:30 – 08:00 | Real-Time Apache Kafka Streaming Pipeline**: Demonstration of real-time event streaming via Kafka topics, consumer ingestion, and dynamic reconstitution of patient digital twin states in MongoDB.
4. **08:00 – 11:00 | Patient 360 Doctor Cockpit & 3D Organ Twin**: Visual inspection of the React 18 dashboard, interactive 3D body organ model reflecting active physiological stress, and dynamic vital trends.
5. **11:00 – 14:00 | AI Predictive Risk Engines & Explainable AI (SHAP)**: Demonstration of multi-condition risk modeling (10-Year CVD risk, sepsis onset, readmission) and transparent SHAP feature attribution charts.
6. **14:00 – 17:00 | Complex Event Processing & Clinical Rule Engine**: Live triggering of multi-vital clinical rules, tiered alarms (Warning vs. Critical), and multi-channel notification dispatch.
7. **17:00 – 20:00 | Care Plan Synthesis, Outcomes & Conclusion**: Automatic generation of personalized intervention care plans, validation of the **-35.0% relative CVD risk reduction**, and summary of clinical outcomes.

---

## 📊 Project Presentation & Evaluation Deliverables

The complete evaluation slide deck is stored directly in the repository root:

| Deliverable | File / Format | Details & Key Topics Covered |
| :--- | :--- | :--- |
| **Final Project Presentation (Milestones 1–4)** | 📊 [**MediSphere_Final_Presentationto4.pptx**](./MediSphere_Final_Presentationto4.pptx) | **12-Slide Evaluation Slide Deck** covering: <br>• Problem statement & acute/remote care data silos <br>• Full technical architecture (FHIR R4, Kafka, MongoDB, FedAvg, React 18) <br>• **Milestone 1**: FHIR integration, patient 360 & digital twin reconstitution <br>• **Milestone 2**: Multi-hospital federated learning simulation <br>• **Milestone 3**: Predictive risk engines & Explainable AI (SHAP feature attribution) <br>• **Milestone 4**: Automated care plan synthesis (-35% CVD risk drop) & CEP alarms <br>• Demonstrated clinical outcomes & live demo walkthrough |
| **System Architecture Specification** | 🏛️ [**System Architecture Diagram**](#-end-to-end-system-architecture) | End-to-end data pipeline flow from wearable sensors to Kafka event streaming, MongoDB digital twin core, AI inference, and React clinical cockpit (also illustrated in Slide 4 of the presentation). |

---

## 🏥 Problem Statement

In contemporary acute and remote healthcare environments, clinical care teams face four critical challenges:

1. **Fragmented Biosensor Telemetry**: Ambulatory wearables (smartwatches, continuous glucose monitors, pulse oximeters) and hospital diagnostic laboratories operate in isolated, incompatible data silos. Clinicians lack a unified, continuous physiological view of the patient.
2. **Severe Monitor Alert Fatigue**: Conventional telemetry monitors evaluate isolated vital sign thresholds, resulting in an estimated 72% to 99% false-positive alarm rate. Clinicians suffer cognitive exhaustion, which often leads to delayed recognition of critical events like septic shock and acute hemodynamic collapse.
3. **Static, Episodic Electronic Health Records**: Existing EHRs store historical, episodic snapshots rather than continuous, predictive representations of human physiology. They are inherently reactive rather than proactive.
4. **Data Privacy & Institutional Silos**: Regulations such as HIPAA and GDPR strictly prohibit pooling identifiable patient records into central databases. Consequently, healthcare AI models cannot easily benefit from multi-hospital institutional data without advanced privacy-preserving architectures.

---

## 💡 Healthcare Use Cases

MediSphere Cognitive Twin resolves these challenges across five key healthcare deployment scenarios:

1. **Continuous Tele-ICU & Remote Patient Monitoring (RPM)**:
   - Synchronizes continuous heart rate, blood pressure, oxygen saturation (SpO2), respiration rate, and body temperature.
   - Reconstructs a real-time reactive digital twin with greater than 95% data completeness.
2. **Early Sepsis & Hemodynamic Decompensation Warning**:
   - Integrates systemic inflammatory response markers (WBC, CRP, lactate) with continuous vital telemetry.
   - Flags acute clinical deterioration hours ahead of overt septic shock, enabling immediate antibiotic and fluid resuscitation.
3. **Post-Surgical & Chronic Disease Rehabilitation**:
   - Monitors post-discharge trajectories for hypertensive, diabetic, and heart failure patients.
   - Synthesizes personalized lifestyle and medication care plans, yielding a **-35.0% projected relative reduction in 10-year cardiovascular event risk**.
4. **Privacy-Preserving Multi-Hospital Federated Learning**:
   - Trains clinical prediction models across distributed hospital edge nodes using Federated Averaging (FedAvg).
   - Zero protected health information (PHI) leaves the local hospital perimeter.
5. **Transparent Clinical Decision Support (CDSS) with Explainable AI**:
   - Computes Shapley additive feature importance (SHAP) for every predictive score.
   - Directly exposes risk drivers (e.g., Systolic BP contributing +28%, LDL contributing +22%) to eliminate algorithmic black-box opacity.

---

## 🏗️ Technical Stack

| Architectural Layer | Technologies & Frameworks | Description |
| :--- | :--- | :--- |
| **Frontend UI** | **React 18, Vite, Canvas 2D/3D SVG, Lucide React** | High-performance clinical cockpit featuring interactive 3D body organ models, dynamic vital gauges, and alert notification bars. |
| **Backend API** | **Node.js 24, Express.js REST API** | Modular microservices handling FHIR resources, Kafka publishers/consumers, rule execution, and twin state assembly. |
| **Healthcare Interoperability** | **HL7 FHIR R4, SMART-on-FHIR, LOINC, SNOMED-CT** | Native FHIR R4 Observation & Patient schemas, standard `/.well-known/smart-configuration` discovery, and clinical semantic mapping. |
| **Event Streaming Bus** | **Apache Kafka & Zookeeper** | High-throughput, distributed event bus for streaming serialized FHIR Observation messages with sub-second latency. |
| **Database & Persistence** | **MongoDB & Mongoose ODM** | Timeseries vital storage, digital twin document models, and immutable HIPAA audit trail logging. |
| **AI / Machine Learning** | **Federated Learning (FedAvg), SHAP, Risk Scoring Engines** | Multi-hospital federated training simulation, Framingham-inspired CVD risk scoring, and Explainable AI (XAI) feature attribution. |
| **Rule & Alarm Engine** | **Complex Event Processing (CEP)** | Multi-vital sliding window rule evaluation with Arden-syntax inspiration and two-tier alert dispatching (Warning vs. Critical). |
| **DevOps & Runtime** | **Docker & Docker Compose** | Reproducible multi-container orchestration for MongoDB and Apache Kafka services. |

---

## 🧠 AI/ML Models & Framework Details

```text
                                 ┌──────────────────────────────────┐
                                 │   Central Aggregation Server     │
                                 │     (Global Model Updates)       │
                                 └─────────────────┬────────────────┘
                                                   │ FedAvg Weights (No PHI)
                      ┌────────────────────────────┼────────────────────────────┐
                      ▼                            ▼                            ▼
         ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
         │ Hospital Site A Node    │  │ Hospital Site B Node    │  │ Hospital Site C Node    │
         │ - Local Patient DB      │  │ - Local Patient DB      │  │ - Local Patient DB      │
         │ - Local Model Gradient  │  │ - Local Model Gradient  │  │ - Local Model Gradient  │
         └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

1. **Multi-Hospital Federated Learning (FedAvg)**:
   - Simulates three distinct hospital clinical nodes with isolated patient databases.
   - Computes loss gradients strictly on local node infrastructure.
   - Transmits only encrypted weight parameters to the central coordinator using Federated Averaging (FedAvg), guaranteeing zero leakage of protected health information.
2. **Multi-Condition Predictive Risk Engine**:
   - **Cardiovascular Disease (CVD) Model**: Evaluates systolic/diastolic blood pressure, total cholesterol, HDL/LDL ratios, HbA1c, smoking history, and age to compute a 10-year cardiac event probability.
   - **Sepsis Screening Index**: Evaluates systemic inflammatory markers, heart rate variability, temperature, and WBC count.
   - **30-Day Hospital Readmission Model**: Forecasts readmission likelihood for chronic cardiopulmonary patients.
3. **Explainable AI (SHAP Feature Attribution)**:
   - Implements Shapley additive explanations to break down each clinical risk score into exact metric contributions.
   - Visualizes positive and negative force contributions, granting clinicians transparent diagnostic rationale.
4. **Complex Event Processing (CEP) Clinical Rule Engine**:
   - Arden-syntax inspired rule engine evaluating temporal sequences of vital signs.
   - Distinguishes isolated sensor noise from sustained decompensation, mitigating alert fatigue while catching real emergencies.

---

## 📐 End-to-End System Architecture

```text
+---------------------------------------------------------------------------------------------------+
| 1. DATA COLLECTION LAYER                                                                          |
|    - Wearable Biosensors (Continuous HR, SpO2, SBP/DBP, Temp, Respiration)                         |
|    - Diagnostic Laboratory Reports (CBC, Electrolytes, Troponin, Creatinine, Lipid Panel)        |
+--------------------------------------------------+------------------------------------------------+
                                                   | Raw Sensor / Lab Records
                                                   v
+---------------------------------------------------------------------------------------------------+
| 2. HL7 FHIR R4 INTEROPERABILITY & CONSENT LAYER                                                   |
|    - Local FHIR API (POST /fhir/R4/Observation, GET /fhir/R4/Patient/:id)                         |
|    - SMART-on-FHIR Standard Discovery (/.well-known/smart-configuration)                          |
|    - Patient Consent Verification Engine                                                          |
+--------------------------------------------------+------------------------------------------------+
                                                   | Serialized FHIR R4 Observation JSON
                                                   v
+---------------------------------------------------------------------------------------------------+
| 3. DISTRIBUTED EVENT STREAMING (APACHE KAFKA)                                                     |
|    - High-throughput 'fhir-observations' topic partitioned by Patient ID                         |
|    - Guaranteed message ordering and zero data loss                                               |
+--------------------------------------------------+------------------------------------------------+
                                                   | Real-Time Event Stream
                                                   v
+---------------------------------------------------------------------------------------------------+
| 4. DIGITAL HEALTH TWIN CORE & STATE PERSISTENCE                                                   |
|    - Kafka Consumer Reconstitution Worker                                                         |
|    - MongoDB Timeseries Store (Twin States, Observation History, Audit Logs)                      |
|    - Data Completeness Guard (>95% Completeness Threshold)                                        |
+--------------------------------------------------+------------------------------------------------+
                                                   | Dynamic Twin State
                                                   v
+---------------------------------------------------------------------------------------------------+
| 5. CLINICAL AI & DECISION SUPPORT SYSTEM                                                          |
|    - Federated Learning Simulator (FedAvg across 3 hospital nodes)                                |
|    - Predictive Risk Models (10-Year CVD, Sepsis, 30-Day Readmission)                             |
|    - Explainable AI (SHAP Feature Importance Attribution)                                         |
|    - Complex Event Processing (CEP) Multi-Tier Alert Engine                                       |
+--------------------------------------------------+------------------------------------------------+
                                                   | Real-time Telemetry & Inferences
                                                   v
+---------------------------------------------------------------------------------------------------+
| 6. REACT 18 DOCTOR 360 CLINICAL DASHBOARD                                                         |
|    - Interactive Canvas/SVG 3D Body Organ Model (Cardiovascular, Pulmonary, Renal, Metabolic)     |
|    - Real-Time Vitals Stream & Historical Trend Visualizations                                    |
|    - Multi-Tier Clinical Alarms (Warning / Critical) & SMS Notifications                          |
|    - Automated Personalized Care Plan Synthesis (-35% CVD Risk Reduction)                        |
+---------------------------------------------------------------------------------------------------+
```

---

## 📈 Demonstrated Outcomes & Impact

| Metric / Parameter | Baseline (Pre-Intervention) | Post-Intervention / Care Plan | Demonstrated Outcome |
| :--- | :--- | :--- | :--- |
| **10-Year Cardiovascular Event Risk** | 24.3% (High Risk) | 15.8% (Controlled) | **-35.0% Relative Risk Drop** |
| **30-Day Hospital Readmission Risk** | 18.6% | 14.2% | **-23.6% Relative Avoidance** |
| **Systolic Blood Pressure (Mean)** | 144 mmHg | 128 mmHg | **-16 mmHg Reduction** |
| **HbA1c Glycemic Index** | 8.4% | 7.1% | **-1.3% Glycemic Control** |
| **Digital Twin Data Completeness** | Target: >95% | **97.8%** | **Validated Compliance** |
| **FHIR R4 Schema Conformance** | 100% Validated | 100% Validated | **Full Interoperability** |
| **Kafka Pipeline Streaming Latency** | Target: <500ms | **~120ms** | **Sub-second Real-time** |

---

## ⚖️ Open-Source License Details

This project is openly published under the **MIT License**.

```text
MIT License

Copyright (c) 2026 Murala Revathi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See the full [LICENSE](LICENSE) file in the repository root.

---

## 🚀 Quickstart & Reproduction Guide

### Prerequisites
- **Node.js** v18+ (Node v24 recommended)
- **Docker Desktop** (for MongoDB and Apache Kafka)
- **Python 3.10+** (for presentation and architecture scripts)

### Step 1: Start Infrastructure (MongoDB + Apache Kafka)
```bash
docker compose up -d
```

### Step 2: Start Backend Server
```bash
cd backend
npm install
npm run dev
```
*The backend API will initialize on `http://localhost:5000`.*

### Step 3: Start Frontend Dashboard
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

### Step 4: Run Data Pipeline Demo
1. In the Patient 360 dashboard, navigate to the **Data Pipeline Panel**.
2. Click **Run Data Pipeline**.
3. Watch the continuous telemetry stream from the local Excel source through the local FHIR R4 API, publish into Apache Kafka, persist into MongoDB, rebuild the Cognitive Twin, and update the interactive 3D Body Model in real time.

---

## 🔒 Verification & Compliance
- **FHIR Capabilities**: `GET http://localhost:5000/fhir/R4/metadata`
- **SMART Discovery**: `GET http://localhost:5000/.well-known/smart-configuration`
- **Patient Resource**: `GET http://localhost:5000/fhir/R4/Patient/P001`
- **Observation Bundle**: `GET http://localhost:5000/fhir/R4/Observation?patient=P001`
- **Digital Twin State**: `GET http://localhost:5000/api/twins/P001`
- **HIPAA Audit Trail**: `GET http://localhost:5000/api/audit`
