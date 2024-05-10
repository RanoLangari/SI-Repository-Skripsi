import {
  createAdmin,
  loginAdmin,
  getAdmin,
  getSkripsiProcess,
  KonfirmasiSkripsi,
  deleteSkripsi,
  changePassword,
  updateProfile,
  getDosen,
  tambahDosen,
  deleteDosen,
  editDosen,
  lupaPassword,
  verifyOtp,
  resetpassword,
  getMahasiswaSkripsiVerified,
  getAllMahasiswa,
  getAllSkripsi,
  importExcelMhs,
  addMahasiswa,
  editDataMahasiswa,
  deleteMahasiswa,
  tambahDataSkripsi,
  UploadDataSkripsi,
  getSkripsiById,
  updateSkripsiById,
  deleteSkripsiById,
  getDataForChartAdmin,
} from "../controller/adminController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/login", loginAdmin);
Router.post("/lupa-password", lupaPassword);
Router.post("/verify-otp", verifyOtp);
Router.post("/reset-password", resetpassword);
Router.post("/create", createAdmin);
Router.get("/getadmin", isAuthorized, getAdmin);
Router.get("/get-skripsi-process", isAuthorized, getSkripsiProcess);
Router.get(
  "/get-mahasiswa-skripsi-verified",
  isAuthorized,
  getMahasiswaSkripsiVerified
);
Router.put("/konfirmasi-skripsi/:id", isAuthorized, KonfirmasiSkripsi);
Router.put("/delete-skripsi/:id", isAuthorized, deleteSkripsi);
Router.put("/change-password", isAuthorized, changePassword);
Router.put("/profile", isAuthorized, updateProfile);
Router.get("/get-dosen", isAuthorized, getDosen);
Router.post("/add-dosen", isAuthorized, tambahDosen);
Router.delete("/delete-dosen/:id", isAuthorized, deleteDosen);
Router.put("/edit-dosen/:id", isAuthorized, editDosen);
Router.get("/get-all-mahasiswa", isAuthorized, getAllMahasiswa);
Router.get("/get-all-skripsi", isAuthorized, getAllSkripsi);
Router.post("/import-excel-mhs", isAuthorized, importExcelMhs);
Router.post("/add-mahasiswa", isAuthorized, addMahasiswa);
Router.put("/edit-data-mahasiswa/:id", isAuthorized, editDataMahasiswa);
Router.delete("/delete-mahasiswa/:id", isAuthorized, deleteMahasiswa);
Router.post("/tambah-data-skripsi", isAuthorized, tambahDataSkripsi);
Router.post("/upload-data-skripsi", isAuthorized, UploadDataSkripsi);
Router.get("/get-skripsi/:id", isAuthorized, getSkripsiById);
Router.put("/update-skripsi/:id", isAuthorized, updateSkripsiById);
Router.delete("/delete-skripsi/:id", isAuthorized, deleteSkripsiById);
Router.get("/get-data-for-chart", isAuthorized, getDataForChartAdmin);
export default Router;
