import Firestore from "@google-cloud/firestore";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

const db = new Firestore({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.KEY_FILENAME,
});

export default db;
