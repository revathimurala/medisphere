# Milestone 1 review — findings and fixes

This project was reviewed against the Milestone 1 specification and tested for
end-to-end correctness. The backend held up well; the frontend had real,
verified bugs. Everything below was found through direct inspection and
testing, not assumption.

## What was already solid

- **Backend logic is genuinely implemented**, not mocked: real MongoDB
  (Mongoose models for Patient/FHIRResource/HealthTwin/Consent/AuditLog), real
  Kafka (KafkaJS producer + consumer), real JWT auth, and a self-hosted FHIR
  R4 API with SMART-on-FHIR discovery.
- Core business logic was unit-tested directly (outside the full server, since
  this sandbox has no Docker/internet access to run live MongoDB or Kafka)
  and behaves correctly: `validateVitals` correctly rejects out-of-range
  readings, `validateFhirResource` correctly rejects malformed resources, and
  `calcCompleteness` produces the right percentage for every combination
  tested.
- The server boots cleanly and fails at exactly the expected point (the
  MongoDB connection) when no database is available — confirming the code
  itself has no startup bugs, only a live-infrastructure dependency this
  review environment couldn't provide.

## Critical bugs found and fixed

1. **The entire frontend was unstyled in practice.** `styles.css` was written
   for `frontend/src/App.jsx` — but nothing imported `App.jsx`. `main.jsx`
   defined and rendered its own, completely different inline `App` component
   with different class names. Checked precisely: **25 of the 29 CSS classes
   the running app actually used had zero matching styles.** The dashboard
   you'd see in a browser was almost entirely default, unstyled HTML.
   **Fix:** deleted the dead `App.jsx`, rebuilt the frontend as proper
   components, and wrote a stylesheet verified to match 100% of the classes
   actually used (68/68, checked programmatically).

2. **The documented core demo pipeline was unreachable from the UI.** The
   README's entire "what happens when you click Run data pipeline" walkthrough
   describes `POST /api/demo/collect-excel` (Collect → FHIR → Kafka →
   MongoDB). That button only existed in the dead `App.jsx`. The actual
   running app had no way to trigger it — the whole documented flow was
   invisible to a user. **Fix:** added `PipelinePanel.jsx`, wired to that
   exact endpoint, with a visual of all five pipeline stages.

3. **RBAC was only partially enforced**, despite the doc requiring "RBAC by
   provider/patient":
   - Login was hardcoded to `role: "provider"` — there was no way to sign in
     as a patient and see the restriction actually apply. **Fix:** the login
     screen now offers both, and a patient signs in scoped to their own
     record.
   - `GET /api/patients` (the full roster) had no role check at all — any
     authenticated patient session could browse every patient. **Fix:** added
     `roleGuard("admin","provider")`.
   - `GET /api/consent/:patientId` and `POST /api/consent` had no ownership
     check — a patient session could read or overwrite *any* patient's
     consent record by ID. **Fix:** both now reject a patient session acting
     on any ID other than their own.

4. **`index.html` was missing `<!DOCTYPE html>`, `<head>`, and `<body>`** —
   just a bare `<div id="root">` and a script tag. Browsers silently
   auto-correct this, but it's invalid markup with no charset/viewport meta.
   **Fix:** replaced with a standard, valid HTML document.

## Verified after fixes

- `node --check` passes on the backend; the patched RBAC routes were
  re-verified for syntax.
- `npm run build` (Vite) completes with no errors.
- Every `.jsx` file's classes were extracted programmatically and diffed
  against `styles.css`: **0 mismatches** (previously 25/29 unstyled).
- The dev server serves and transforms all new modules (main.jsx, App.jsx,
  every component, the auth context) without error.

## What still requires live infrastructure to fully verify

This review environment has no Docker and no internet access to pull MongoDB
or Kafka binaries, so the following are verified by code review and isolated
logic testing only, not a live run:

- The actual Kafka producer → consumer → MongoDB write path (the message
  envelope shape and consumer logic were read carefully and look correct, but
  weren't executed against a real broker).
- The self-referential OAuth loopback (`fhirToken()` calling `/smart/token`
  on the same server) under real concurrent load.

Run `docker compose up -d` and the two `npm run dev` commands per the main
README, then exercise the "Run data pipeline" button and the patient-login
flow, to complete that verification.
