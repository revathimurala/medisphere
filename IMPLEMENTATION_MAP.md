# Milestone 1 implementation map

| Requirement from supplied document | Final implementation |
|---|---|
| FHIR R4 API integration | Local FHIR R4 API under `/fhir/R4`; collection layer calls it over HTTP before Kafka |
| MongoDB patient twin store | `HealthTwin` Mongoose model; Kafka Consumer writes FHIR resources and rebuilds the twin |
| SMART on FHIR | `/.well-known/smart-configuration` + configurable SMART token/discovery settings |
| Kafka vitals streaming | `patient-health-data` topic; FHIR resources are published after the FHIR step |
| Patient 360 UI | React Patient 360 dashboard with patient identity, wearable vitals, labs, twin flow and consent |
| Consent management | `Consent` model, provider/patient access check and consent status |
| FHIR resource validation | FHIR resource validation before accepting collection resources + validation endpoint |
| HIPAA audit logging | `AuditLog` model and audit events for collection, consent, FHIR/Kafka and twin access |
| Twin completeness >95% | Milestone 1 completeness calculation over patient, wearable, lab, FHIR validity and consent |
| Vitals range validation | Heart rate, BP and SpO2 range checks on wearable collection |
| RBAC by provider/patient | JWT role guard and patient self-access rule |
| Data sources for this customized scope | Wearables + laboratory reports only; hospital EHR removed as requested |
| Excel | Raw dummy wearable/lab input only; no FHIR resources are stored in Excel |
| Milestone 2/3/4 AI features | Not implemented in Milestone 1; deliberately reserved for later milestones |

## Exact runtime pipeline

`COLLECT DATA -> FHIR R4 API -> KAFKA -> MONGODB -> DIGITAL HEALTH TWIN -> REACT PATIENT 360`

The Excel demo endpoint executes this sequence. It does not directly insert clinical rows into MongoDB and it does not publish raw Excel rows to Kafka. It first converts each raw row through the local FHIR API, then publishes the returned FHIR resource.
