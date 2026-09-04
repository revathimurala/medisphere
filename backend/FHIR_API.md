# MediSphere Local FHIR R4 API

The Milestone 1 implementation includes a local FHIR R4 API in the same Node.js server.

Base URL:

`http://localhost:4000/fhir/R4`

FHIR version: R4 / 4.0.1

## Endpoints
 
 - `GET /metadata` — CapabilityStatement
 - `GET /Patient/:id` — Patient resource (supports JSON and XML via `?_format=xml`)
 - `GET /Patient?identifier=...` — Patient Bundle search
 - `GET /Observation?patient=:id` — Observation Bundle
 - `GET /Condition?patient=:id` — Condition Bundle
 - `GET /MedicationRequest?patient=:id` — MedicationRequest Bundle
 - `GET /DiagnosticReport?patient=:id` — DiagnosticReport Bundle
 - `POST /fhir/R4/$validate` — Standard HL7 FHIR R4 resource validation (returns `OperationOutcome`)
 - `POST /fhir/R4/:resourceType` — Ingest Observation / DiagnosticReport resources

Powered natively in Node.js by the official **`fhir`** npm engine (HL7 FHIR R4 schema specification). Zero Java required.

The application integration endpoint:

`POST /api/fhir/sync/P001`

does NOT read Excel. It makes HTTP requests to the local FHIR R4 API, receives FHIR JSON resources,
validates/stores them, and rebuilds the MongoDB digital twin.

## Why same Node.js server?

This avoids the unnecessary second server that was discussed earlier. The same Express process exposes:

- `/fhir/R4/*` = the EHR/FHIR API being implemented for the project
- `/api/*` = MediSphere application/business APIs

They are logically separate APIs even though they run in one server process.

For production, `/fhir/R4` can later be replaced with the hospital's actual EHR FHIR endpoint.


## Sequential Milestone 1 pipeline

The application deliberately demonstrates the requested order:

`Collect Data -> FHIR R4 API -> Kafka -> MongoDB -> Digital Health Twin -> React Dashboard`

Raw wearable and laboratory rows are collected from the demo workbook. The backend creates FHIR R4
Observation resources from those raw records, writes them to the local FHIR API store, and publishes
the FHIR resources to Kafka. The Kafka consumer is the component that persists the FHIR resources into
MongoDB and rebuilds the Digital Health Twin.

Excel is therefore **input data only**. It does not contain pre-built FHIR resources.
