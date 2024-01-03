import {
  registerMahasiswa,
  loginMahasiswa,
  uploadSkripsi,
  getSkripsi,
  getProfile,
} from "../controller/mahasiswaController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/register", registerMahasiswa);
Router.post("/login", loginMahasiswa);
Router.post("/upload-skripsi", isAuthorized, uploadSkripsi);
Router.get("/get-skripsi", isAuthorized, getSkripsi);
Router.get("/profile", isAuthorized, getProfile);

export default Router;
