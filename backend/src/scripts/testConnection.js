import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
const maskedUri = uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@") : "none";
console.log(`Testing MongoDB connection to: ${maskedUri}`);

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 10000),
    dbName: process.env.MONGO_DB_NAME || "medisphere"
  });
  console.log(" Connection SUCCESSFUL!");
  console.log(` Database Name: ${mongoose.connection.name}`);
  console.log(` Host: ${mongoose.connection.host}`);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(` Collections in database: ${collections.map(c => c.name).join(", ") || "(none yet - brand new DB)"}`);
  await mongoose.disconnect();
  console.log(" Disconnected cleanly.");
} catch (err) {
  console.error(` Connection FAILED: ${err.message}`);
  if (err.message.includes("SSL alert number 80") || err.message.includes("tlsv1 alert internal error")) {
    console.error("\n==================================================================");
    console.error(" [ATLAS FIREWALL / IP ACCESS ISSUE DETECTED]");
    console.error(" MongoDB Atlas rejected the TLS handshake because your current IP");
    console.error(" address is not permitted in Atlas Network Access.");
    console.error("\n How to fix this in MongoDB Atlas:");
    console.error(" 1. Go to https://cloud.mongodb.com and open your project.");
    console.error(" 2. In the left sidebar under 'Security', click 'Network Access'.");
    console.error(" 3. Click '+ ADD IP ADDRESS'.");
    console.error(" 4. Click 'ALLOW ACCESS FROM ANYWHERE' (0.0.0.0/0) or 'ADD CURRENT IP ADDRESS'.");
    console.error(" 5. Click 'Confirm' and wait 30-60 seconds for status to show 'Active'.");
    console.error(" 6. Run 'npm run test-db' again.");
    console.error("==================================================================\n");
  }
  process.exit(1);
}
