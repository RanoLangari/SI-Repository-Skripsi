import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.BUCKET_KEY,
});

export default storage;
