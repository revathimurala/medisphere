# MediSphere Cognitive Twin

## FHIR Integration & Digital Twin Foundation

This version is intentionally scoped to the requested Milestone 1 sources:
- Smart-watch / wearable readings
- Laboratory reports
- No hospital EHR source is used
- No public FHIR server is required

### Technology used for this implementation
- Backend: Node.js + Express
- Frontend: React + Vite
- Database: MongoDB
- Real-time/event streaming: Apache Kafka
- Healthcare interoperability: local FHIR R4 API + SMART-on-FHIR discovery/configuration
- Demo source: Excel workbook containing raw wearable and laboratory rows only

## Exact Milestone 1 flow

```text
1. COLLECT DATA
   Wearables + Laboratory Reports
             ↓
2. FHIR R4 API
   Raw collected data is converted to FHIR R4 Observation resources
             ↓
3. APACHE KAFKA
   FHIR resources are published as events
             ↓
4. MONGODB
   Kafka Consumer persists the FHIR resources
             ↓
5. DIGITAL HEALTH TWIN
   MongoDB data is assembled into the patient's twin
             ↓
6. REACT PATIENT 360
   Doctor-facing dashboard
```

### What happens when you click “Run data pipeline”

The Node.js backend reads the raw rows from `data/medisphere_milestone1_demo.xlsx`. For each row it:

1. **Collects** the raw wearable/lab data.
2. Calls the local **FHIR R4 API over HTTP** (`POST /fhir/R4/Observation`).
3. Uses the FHIR response returned by that API as the message sent to Kafka.
4. The Kafka Consumer receives the message and writes it to MongoDB.
5. The consumer rebuilds the Digital Health Twin.
6. React reads the twin through `/api/twins/:patientId`.

The Excel workbook is **not a FHIR resource store**. It contains raw demo input only.

## Local FHIR API

The same Node.js process exposes a separate FHIR API namespace under `/fhir/R4`. This is an implementation of the FHIR integration boundary for the project, not a public FHIR dependency.

- `GET /fhir/R4/metadata` — FHIR R4 CapabilityStatement
- `GET /fhir/R4/Patient/P001` — Patient resource
- `GET /fhir/R4/Observation?patient=P001` — Observation Bundle
- `POST /fhir/R4/Observation` — receive a newly converted FHIR Observation from the collection layer
- `GET /.well-known/smart-configuration` — SMART-on-FHIR discovery

The local Patient registry exists only to provide Patient identity for the Patient 360 demo; it is not hospital EHR data.

## Milestone 1 validation included

- FHIR resource validation
- HIPAA audit logging foundation
- Patient consent verification
- Twin data completeness check (`>95%`)
- Wearable vital-range validation
- RBAC provider/patient
- SMART-on-FHIR discovery/configuration
- MongoDB digital twin persistence
- Kafka producer/consumer pipeline

AI risk prediction, TensorFlow Federated, SHAP, anomaly alerts and care-plan generation are intentionally left for Milestones 2–4.

## Runtime

You need three runtime components, but only **one application backend server**:

```text
Docker: MongoDB + Kafka
        ↓
Node.js: MediSphere API + local FHIR API + Kafka producer/consumer
        ↓
React: Patient 360 UI
```

Start infrastructure:

```bash
docker compose up -d
```

Start backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Start frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.
