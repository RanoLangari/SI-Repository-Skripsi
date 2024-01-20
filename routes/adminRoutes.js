import {
  createAdmin,
  loginAdmin,
  getAdmin,
  checkLoginAdmin,
  getSkripsiProcess,
  KonfirmasiSkripsi,
  deleteSkripsi,
  changePassword,
  updateProfile,
  getDosen,
} from "../controller/adminController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/login", loginAdmin);
Router.get("/check-login", isAuthorized, checkLoginAdmin);
Router.post("/create", createAdmin);
Router.get("/getadmin", isAuthorized, getAdmin);
Router.get("/get-skripsi-process", isAuthorized, getSkripsiProcess);
Router.put("/konfirmasi-skripsi/:id", isAuthorized, KonfirmasiSkripsi);
Router.put("/delete-skripsi/:id", isAuthorized, deleteSkripsi);
Router.put("/change-password", isAuthorized, changePassword);
Router.put("/profile", isAuthorized, updateProfile);
Router.get("/get-dosen", isAuthorized, getDosen);
export default Router;
