import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { startKafka } from "./config/kafka.js";
import { seedInitialDatabase } from "./services/seedService.js";
import { persistFhirResource } from "./services/twinService.js";
import masterRouter from "./routes/index.js";

process.on("uncaughtException", (err) => {
  if (err.name === "MongoNetworkError" || err.message?.includes("SSL alert") || err.message?.includes("tlsv1 alert")) {
    console.warn("Recovered from background TLS pool event:", err.message);
    return;
  }
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.warn("Background rejection caught:", reason?.message || reason);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb", type: ["application/json", "application/fhir+json", "application/*+json"] }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Mount all routes
app.use(masterRouter);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`MediSphere backend is running on http://localhost:${PORT}`));

(async function initBackgroundServices() {
  await connectDB();

  // Auto-seed cohort immediately on backend launch
  try {
    await seedInitialDatabase();
  } catch (seedErr) {
    console.warn("Patient seeding notice:", seedErr.message);
  }

  try {
    await startKafka(async ({ message }) => {
      const envelope = JSON.parse(message.value.toString());
      const resource = envelope.resource;
      if (!resource) return;
      const patientId = resource.resourceType === "Patient"
        ? resource.id
        : resource?.subject?.reference?.replace("Patient/", "");
      if (!patientId) return;
      await persistFhirResource(envelope);
    });
  } catch (error) {
    console.warn(`Kafka is unavailable; using direct MongoDB persistence. ${error.message}`);
  }
})();
