import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const uri=process.env.MONGO_URI||"mongodb://localhost:27017/medisphere";
const file=path.resolve(process.cwd(),"../data/medisphere_milestone1_demo.xlsx");

const consentSchema=new mongoose.Schema({patientId:String,providerId:String,purpose:String,status:String,updatedAt:Date});
const resourceSchema=new mongoose.Schema({patientId:String,resourceType:String,fhirId:String,resource:Object,source:String,valid:Boolean,receivedAt:Date});
const Consent=mongoose.model("Consent",consentSchema);
const FHIRResource=mongoose.model("FHIRResource",resourceSchema);

await mongoose.connect(uri);
const wb=xlsx.readFile(file);
const rows=name=>xlsx.utils.sheet_to_json(wb.Sheets[name],{defval:null});

for(const r of rows("Consent")) await Consent.findOneAndUpdate(
  {patientId:r.patientId,providerId:r.providerId,purpose:r.purpose},
  {patientId:r.patientId,providerId:r.providerId,purpose:r.purpose,status:r.status,updatedAt:new Date()},
  {upsert:true}
);

for(const r of rows("WearableVitals")) {
  const resource={patientId:r.patientId,timestamp:r.timestamp,heartRate:Number(r.heartRate),systolic:Number(r.systolic),diastolic:Number(r.diastolic),spo2:Number(r.spo2)};
  await FHIRResource.create({patientId:r.patientId,resourceType:"WearableObservation",fhirId:`excel-${r.patientId}-${r.timestamp}`,resource,source:"Excel demo wearable source",valid:true});
}
console.log("Demo import complete. Clinical/EHR sheets were NOT converted into FHIR resources.");
await mongoose.disconnect();
