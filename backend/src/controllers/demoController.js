import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { processExcelWorkbook } from "../services/excelService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @route POST /api/demo/collect-excel
 * @desc Parses default clinical Excel demo dataset and populates patients, FHIR resources, and Digital Twins
 * @access Protected (Admin, Provider)
 */
export async function collectExcel(req, res) {
  try {
    const file = path.resolve(__dirname, "../../../data/medisphere_milestone1_demo.xlsx");
    const wb = xlsx.readFile(file);
    const result = await processExcelWorkbook(wb, req.user.sub);
    res.json(result);
  } catch (e) {
    res.status(502).json({ message: "Demo collection failed", detail: e.response?.data || e.message });
  }
}

/**
 * @route POST /api/demo/upload-excel
 * @desc Ingests custom uploaded base64 Excel clinical workbook and executes full FHIR/Kafka data pipeline
 * @access Protected (Admin, Provider)
 */
export async function uploadExcel(req, res) {
  try {
    const { fileBase64, filename } = req.body || {};
    if (!fileBase64) {
      return res.status(400).json({ message: "No file provided. Please provide an Excel file (.xlsx)." });
    }
    const cleanBase64 = fileBase64.replace(/^data:application\/[^;]+;base64,/, "").replace(/^data:.*\/.*;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const wb = xlsx.read(buffer, { type: "buffer" });
    const result = await processExcelWorkbook(wb, req.user.sub);
    res.json({ ...result, filename: filename || "uploaded.xlsx" });
  } catch (e) {
    res.status(502).json({ message: "Failed to process uploaded Excel workbook", detail: e.message });
  }
}

/**
 * @route GET /api/demo/download-template
 * @desc Downloads clinical Excel template containing structured sheets for Patients, Consents, Vitals, Labs, Conditions, and Medications
 * @access Protected
 */
export function downloadTemplate(req, res) {
  const file = path.resolve(__dirname, "../../../data/medisphere_milestone1_demo.xlsx");
  res.download(file, "medisphere_clinical_data_template.xlsx");
}
