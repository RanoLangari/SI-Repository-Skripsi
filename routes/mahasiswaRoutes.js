import {
  registerMahasiswa,
  loginMahasiswa,
  uploadSkripsi,
  getHalfSkripsi,
  getSkripsiById,
  getProfile,
  updateProfile,
  getSkripsiByJurusan,
  checkLoginMahasiswa,
  getSkripsiStatus,
  changePassword,
} from "../controller/mahasiswaController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/register", registerMahasiswa);
Router.post("/login", loginMahasiswa);
Router.get("/check-login", isAuthorized, checkLoginMahasiswa);
Router.post("/upload-skripsi", isAuthorized, uploadSkripsi);
Router.get("/get-skripsi", isAuthorized, getHalfSkripsi);
Router.get("/profile", isAuthorized, getProfile);
Router.put("/profile", isAuthorized, updateProfile);
Router.get("/detail-skripsi/:id", isAuthorized, getSkripsiById);
Router.get("/skripsi-status", isAuthorized, getSkripsiStatus);
Router.post("/change-password", isAuthorized, changePassword);

export default Router;
