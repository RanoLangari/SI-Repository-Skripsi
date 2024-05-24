import Firestore from "@google-cloud/firestore";
import dotenv from "dotenv";
dotenv.config();

const db = new Firestore({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.KEY_FILENAME,
});

if (process.env.NODE_ENV === "development") {
  db.settings({
    host: "127.0.0.1:5125",
    ssl: false,
  });
}

export default db;
