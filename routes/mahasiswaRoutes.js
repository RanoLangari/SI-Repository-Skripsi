import {
  loginMahasiswa,
  uploadSkripsi,
  getHalfSkripsi,
  getSkripsiById,
  getProfile,
  updateProfile,
  getSkripsiByJurusan,
  getSkripsiStatus,
  changePassword,
  getDosenByJurusan,
  getSkripsiByDate,
  lupaPassword,
  verifyOtp,
  getUrlSkripsi,
  resetpassword,
} from "../controller/mahasiswaController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/login", loginMahasiswa);
Router.post("/lupa-password", lupaPassword);
Router.post("/verify-otp", verifyOtp);
Router.post("/reset-password", resetpassword);
Router.post("/upload-skripsi", isAuthorized, uploadSkripsi);
Router.get("/get-skripsi", isAuthorized, getHalfSkripsi);
Router.post("/get-skripsi-jurusan", isAuthorized, getSkripsiByJurusan);
Router.get("/get-skripsi-date", isAuthorized, getSkripsiByDate);
Router.get("/profile", isAuthorized, getProfile);
Router.put("/profile", isAuthorized, updateProfile);
Router.get("/detail-skripsi/:id", isAuthorized, getSkripsiById);
Router.get("/get-url-skripsi/:id", isAuthorized, getUrlSkripsi);
Router.get("/skripsi-status", isAuthorized, getSkripsiStatus);
Router.put("/change-password", isAuthorized, changePassword);
Router.post("/get-dosen-by-jurusan", isAuthorized, getDosenByJurusan);

export default Router;
