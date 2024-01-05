import {
  registerMahasiswa,
  loginMahasiswa,
  uploadSkripsi,
  getHalfSkripsi,
  getSkripsiById,
  getProfile,
  updateProfile,
} from "../controller/mahasiswaController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/register", registerMahasiswa);
Router.post("/login", loginMahasiswa);
Router.post("/upload-skripsi", isAuthorized, uploadSkripsi);
Router.get("/get-skripsi", isAuthorized, getHalfSkripsi);
Router.get("/profile", isAuthorized, getProfile);
Router.put("/profile", isAuthorized, updateProfile);
Router.get("/detail-skripsi/:id", isAuthorized, getSkripsiById);

export default Router;
