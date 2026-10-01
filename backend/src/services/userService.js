import User, { hashPassword } from "../models/User.js";
import Patient from "../models/Patient.js";
import Consent from "../models/Consent.js";
import { rebuildTwin } from "./twinService.js";

export const DEFAULT_USERS = [
  {
    username: "clinician-demo",
    password: "123456",
    role: "provider",
    name: "Dr. Evelyn Reed, MD",
    email: "dr.reed@medisphere.hospital",
    patientId: ""
  },
  {
    username: "admin",
    password: "123456",
    role: "admin",
    name: "System Administrator",
    email: "admin@medisphere.hospital",
    patientId: ""
  },
  {
    username: "P001",
    password: "123456",
    role: "patient",
    name: "John Doe",
    email: "john.doe@medisphere.patient",
    patientId: "P001"
  },
  {
    username: "P002",
    password: "123456",
    role: "patient",
    name: "Jane Roe",
    email: "jane.roe@medisphere.patient",
    patientId: "P002"
  },
  {
    username: "P003",
    password: "123456",
    role: "patient",
    name: "Robert Johnson",
    email: "robert.johnson@medisphere.patient",
    patientId: "P003"
  },
  {
    username: "P004",
    password: "123456",
    role: "patient",
    name: "Maria Garcia",
    email: "maria.garcia@medisphere.patient",
    patientId: "P004"
  },
  {
    username: "P005",
    password: "123456",
    role: "patient",
    name: "David Kim",
    email: "david.kim@medisphere.patient",
    patientId: "P005"
  }
];

/**
 * Seeds or updates default accounts with securely hashed passwords (123456).
 */
export async function seedDefaultUsers() {
  try {
    for (const u of DEFAULT_USERS) {
      const { salt, hash } = hashPassword(u.password);
      await User.findOneAndUpdate(
        { username: { $regex: new RegExp(`^${u.username}$`, "i") } },
        {
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          patientId: u.patientId || (u.role === "patient" ? u.username : ""),
          hash,
          salt,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn("User seeding notice:", err.message);
  }
}

/**
 * Looks up user by username (case-insensitive)
 */
export async function findUserByUsername(username) {
  if (!username) return null;
  const clean = String(username).trim();
  let user = await User.findOne({
    username: { $regex: new RegExp(`^${clean}$`, "i") }
  });

  // If not found in DB, check if it matches a default user and seed on the fly
  if (!user) {
    const defaultMatch = DEFAULT_USERS.find(
      (d) => d.username.toLowerCase() === clean.toLowerCase()
    );
    if (defaultMatch) {
      const { salt, hash } = hashPassword(defaultMatch.password);
      try {
        user = await User.create({
          username: defaultMatch.username,
          name: defaultMatch.name,
          email: defaultMatch.email,
          role: defaultMatch.role,
          patientId: defaultMatch.patientId || (defaultMatch.role === "patient" ? defaultMatch.username : ""),
          hash,
          salt
        });
      } catch {
        // Fallback in case of concurrent create
        user = await User.findOne({
          username: { $regex: new RegExp(`^${clean}$`, "i") }
        });
      }
    }
  }

  return user;
}

/**
 * Registers a new patient with corresponding Patient document, Consent, and initial Twin
 */
export async function registerPatientRecord(patientId, name, gender = "unknown", birthDate = "1990-01-01") {
  try {
    const nameParts = name.trim().split(" ");
    const given = nameParts.slice(0, -1).length ? nameParts.slice(0, -1) : [nameParts[0]];
    const family = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    await Patient.findOneAndUpdate(
      { fhirId: patientId },
      {
        fhirId: patientId,
        resource: {
          resourceType: "Patient",
          id: patientId,
          name: [{ family, given }],
          gender,
          birthDate
        },
        source: "Self-Registered/Portal",
        updatedAt: new Date()
      },
      { upsert: true }
    );

    await Consent.findOneAndUpdate(
      { patientId },
      {
        patientId,
        providerId: "clinician-demo",
        purpose: "clinical-care",
        status: "granted",
        updatedAt: new Date()
      },
      { upsert: true }
    );

    await rebuildTwin(patientId);
  } catch (err) {
    console.warn("Could not auto-generate patient twin on signup:", err.message);
  }
}
