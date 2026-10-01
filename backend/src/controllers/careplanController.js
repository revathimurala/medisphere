import { careplanService } from "../services/careplanService.js";

/**
 * @route GET /api/careplans/:patientId?
 * @desc Retrieves care plan. Patients may ONLY view their own care plan, which must be given/authorized by a doctor.
 * @access Protected (Clinicians, or Patient viewing self)
 */
export async function getCarePlan(req, res) {
  try {
    let patientId = req.params.patientId || req.query.patientId;
    
    // If user is a patient, strictly enforce that they can only request their own patient ID
    if (req.user?.role === "patient") {
      if (patientId && patientId !== req.user.sub) {
        return res.status(403).json({
          error: "RBAC Denied: Patients are strictly authorized to view only their own assigned care plan.",
        });
      }
      patientId = req.user.sub;
    }

    patientId = patientId || "P001";
    const carePlan = await careplanService.getCarePlan(patientId);

    if (!carePlan) {
      return res.status(404).json({ error: `No care plan found for patient ${patientId}.` });
    }

    res.json(carePlan);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to retrieve care plan" });
  }
}

/**
 * @route POST /api/careplans/generate/:patientId?
 * @desc Generates or regenerates an AI care plan. Restricted to licensed clinicians.
 * @access Protected (Clinician only)
 */
export async function generateCarePlan(req, res) {
  try {
    if (req.user?.role === "patient") {
      return res.status(403).json({
        error: "RBAC Denied: Only attending clinicians are authorized to generate or prescribe clinical care plans.",
      });
    }

    const patientId = req.params.patientId || req.body.patientId || "P001";
    const options = req.body || {};
    const carePlan = await careplanService.generateCarePlan(patientId, options);
    res.json(carePlan);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate AI care plan" });
  }
}

/**
 * @route GET /api/careplans/:patientId/guidelines
 * @desc Evaluates guidelines. Patients can only view guidelines for their own care plan.
 */
export async function evaluateGuidelines(req, res) {
  try {
    const patientId = req.params.patientId || req.query.patientId || (req.user?.role === "patient" ? req.user.sub : "P001");
    
    if (req.user?.role === "patient" && req.user.sub !== patientId) {
      return res.status(403).json({ error: "RBAC Denied: Access restricted to self." });
    }

    const result = await careplanService.evaluateGuidelines(patientId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to evaluate clinical guidelines" });
  }
}

/**
 * @route POST /api/careplans/:patientId/adherence/task
 * @desc Updates task status. Patients can only update tasks in their own checklist.
 */
export async function updateAdherence(req, res) {
  try {
    const patientId = req.params.patientId || (req.user?.role === "patient" ? req.user.sub : "P001");
    
    if (req.user?.role === "patient" && req.user.sub !== patientId) {
      return res.status(403).json({ error: "RBAC Denied: Cannot modify another patient's adherence logs." });
    }

    const { taskId, status } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }
    const updatedAdherence = await careplanService.updateAdherenceTask(patientId, taskId, status);
    res.json(updatedAdherence);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update adherence task" });
  }
}

/**
 * @route POST /api/careplans/:patientId/adherence/wearable-sync
 * @desc Syncs wearable steps. Patients can only sync their own wearable biometrics.
 */
export async function syncWearableAdherence(req, res) {
  try {
    const patientId = req.params.patientId || (req.user?.role === "patient" ? req.user.sub : "P001");
    
    if (req.user?.role === "patient" && req.user.sub !== patientId) {
      return res.status(403).json({ error: "RBAC Denied: Cannot sync biometrics for another patient." });
    }

    const { steps, hoursWorn } = req.body;
    const result = await careplanService.syncWearableAdherence(patientId, steps, hoursWorn);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to sync wearable adherence" });
  }
}

/**
 * @route GET /api/careplans/:patientId/outcomes
 * @desc Retrieves outcome measurement and hospitalization reduction data.
 */
export async function getOutcomeMeasurement(req, res) {
  try {
    const patientId = req.params.patientId || req.query.patientId || (req.user?.role === "patient" ? req.user.sub : "P001");
    
    if (req.user?.role === "patient" && req.user.sub !== patientId) {
      return res.status(403).json({ error: "RBAC Denied: Access restricted to self." });
    }

    const outcome = await careplanService.getOutcomeMeasurement(patientId);
    res.json(outcome);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to retrieve outcome measurements" });
  }
}

/**
 * @route POST /api/careplans/:patientId/notes
 * @desc Appends clinical note or patient inquiry.
 */
export async function addClinicalNote(req, res) {
  try {
    const patientId = req.params.patientId || (req.user?.role === "patient" ? req.user.sub : "P001");
    
    if (req.user?.role === "patient" && req.user.sub !== patientId) {
      return res.status(403).json({ error: "RBAC Denied: Cannot append notes to another patient's record." });
    }

    const noteData = req.body || {};
    if (req.user?.role === "patient") {
      noteData.providerName = `Patient (${req.user.sub})`;
      noteData.role = "Patient Feedback / Self-Report";
      noteData.category = "Patient Question / Symptom Report";
    }

    const createdNote = await careplanService.addClinicalNote(patientId, noteData);
    res.json(createdNote);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to add clinical note" });
  }
}

/**
 * @route POST /api/careplans/:patientId/sign
 * @desc Digitally signs and attests care plan. Strictly restricted to licensed clinicians.
 * @access Protected (Clinician only)
 */
export async function signCarePlan(req, res) {
  try {
    if (req.user?.role === "patient") {
      return res.status(403).json({
        error: "RBAC Denied: Patients cannot sign or attest clinical orders.",
      });
    }

    const patientId = req.params.patientId || "P001";
    const signData = req.body || {};
    const signOff = await careplanService.signCarePlan(patientId, signData);
    res.json(signOff);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to sign care plan" });
  }
}

/**
 * @route GET /api/careplans/stats/overview
 * @desc System-wide overview metrics. Clinician only.
 */
export async function getCarePlanStats(req, res) {
  try {
    if (req.user?.role === "patient") {
      return res.status(403).json({ error: "RBAC Denied: Overview stats are clinician only." });
    }
    const stats = careplanService.getCarePlanStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to get care plan stats" });
  }
}

