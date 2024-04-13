import { FieldValue } from "@google-cloud/firestore";
import storage from "../utils/storege.js";
import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import EmailService from "../utils/emailService.js";
import Helper from "../utils/helper.js";
dotenv.config();

const saltRounds = 8;
const emailService = new EmailService();
const helper = new Helper();

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = db.collection("admin").where("username", "==", username);
    const snapshot = await query.get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Username tidak terdaftar");
    const user = snapshot.docs[0].data();
    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch)
      return helper.responseError(res, 400, "Password salah");
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );
    res.status(200).send({
      status: "success",
      message: "Login berhasil",
      token,
    });
  } catch (error) {
    console.log("Error in loginAdmin: ", error);
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, confirm_password } = req.body;
    if (password !== confirm_password)
      return helper.responseError(res, 400, "Password tidak sama");
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("admin");
    const data = {
      username,
      email,
      password: hashPassword,
    };
    const snapshot = await query.where("email", "==", email).get();
    if (!snapshot.empty)
      return helper.responseError(res, 400, "Email sudah terdaftar");
    const result = await query.add(data);
    return helper.response(res, 200, "Admin berhasil ditambahkan", {
      id: result.id,
      ...data,
    });
  } catch (error) {
    console.log("Error in createAdmin: ", error);
  }
};

export const getAdmin = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    const data = {
      email: snapshot.data().email,
      username: snapshot.data().username,
    };
    snapshot.exists
      ? helper.response(res, 200, "Data Ditemukan", data)
      : helper.responseError(res, 400, "Data tidak ditemukan");
  } catch (error) {
    console.log("Error in getAdmin: ", error);
  }
};

export const getSkripsiProcess = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi.status", "==", "proses").get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data mahasiswa",
      result
    );
  } catch (error) {
    console.log("Error in getSkripsiProcess: ", error);
  }
};

export const KonfirmasiSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    emailService.sendEmailSkripsiVerified(data.email);
    await query.update({
      "skripsi.status": "Terverifikasi",
    });
    return helper.response(res, 200, "Status skripsi Terverifikasi", data);
  } catch (error) {
    console.log("Error in konfirmasiSkripsi: ", error);
  }
};

export const deleteSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const file = bucket.file(`${id}.pdf`);
    await file.delete();
    await query.update({
      skripsi: FieldValue.delete(),
    });
    const data = snapshot.data();
    emailService.sendEmailSkripsiReject(data.email);
    return helper.response(res, 200, "Status skripsi Ditolak", data);
  } catch (error) {
    console.log("Error in deleteSkripsi: ", error);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { old_password, new_password } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const user = snapshot.data();
    const isPasswordMatch = bcrypt.compareSync(old_password, user.password);
    if (!isPasswordMatch)
      return helper.responseError(res, 400, "Password salah");
    const hashPassword = bcrypt.hashSync(new_password, saltRounds);
    await query.update({
      password: hashPassword,
    });
    return helper.response(res, 200, "Password berhasil diubah", user);
  } catch (error) {
    console.log("Error in ChangePassword: ", error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { username, email } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    await query.update({ username, email });
    return helper.response(res, 200, "Profile berhasil diubah");
  } catch (error) {
    console.log("Error in updateProfilAdmin: ", error);
  }
};

export const getDosen = async (_, res) => {
  try {
    const query = db.collection("dosen");
    const snapshot = await query.get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return helper.response(res, 200, "Berhasil mendapatkan data dosen", result);
  } catch (error) {
    console.log("Error in getDosen: ", error);
  }
};

export const tambahDosen = async (req, res) => {
  try {
    const { nama, jurusan } = req.body;
    const query = db.collection("dosen");
    const data = {
      nama,
      jurusan,
    };
    const result = await query.add(data);
    return helper.response(res, 200, "Dosen berhasil ditambahkan", {
      id: result.id,
      ...data,
    });
  } catch (error) {
    console.log("Error in tambahDosen: ", error);
  }
};

export const deleteDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Dosen tidak ditemukan");
    await query.delete();
    return helper.responseSuccess(res, 200, "Dosen berhasil dihapus");
  } catch (error) {
    console.log("Error in deleteDosen: ", error);
  }
};

export const editDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama, jurusan } = req.body;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Dosen tidak ditemukan");
    await query.update({
      nama,
      jurusan,
    });
    return helper.responseSuccess(res, 200, "Dosen berhasil diupdate");
  } catch (error) {
    console.log("Error in editDosen: ", error);
  }
};

export const lupaPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak terdaftar");
    const RandomNumberOtp = Math.floor(1000 + Math.random() * 9000);
    emailService.sendOtpResetPasswordEmail(email, RandomNumberOtp);
    db.collection("admin").doc(snapshot.docs[0].id).update({
      otp: RandomNumberOtp,
    });
    return helper.responseSuccess(res, 200, "Berhasil mengirim kode OTP");
  } catch (error) {
    console.log("Error in lupaPassword:", error);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak terdaftar");
    const data = snapshot.docs[0].data();
    if (data.otp != otp)
      return helper.responseError(res, 400, "Kode OTP tidak valid");
    return helper.responseSuccess(res, 200, "Kode OTP valid");
  } catch (error) {
    console.log("Error in verifyOtp:", error);
  }
};

export const resetpassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak valid");
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const result = await snapshot.docs[0].ref.update({
      password: hashPassword,
      otp: FieldValue.delete(),
    });
    if (!result) return helper.responseError(res, 400, "Gagal reset password");
    return helper.responseSuccess(res, 200, "Berhasil reset password");
  } catch (error) {
    console.log("Error in resetpassword:", error);
  }
};
export const getMahasiswaSkripsiVerified = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query
      .where("skripsi.status", "==", "Terverifikasi")
      .get();
    const result = snapshot.docs.map((doc) => ({
      ...doc.data(),
    }));
    const mapResult = result.map((item) => {
      return {
        nama: item.nama,
        nim: item.nim,
        jurusan: item.jurusan,
        semester: item.semester,
        judul_skripsi: item.skripsi.judul_skripsi,
        pembimbing1: item.skripsi.pembimbing1,
        pembimbing2: item.skripsi.pembimbing2,
        penguji: item.skripsi.penguji,
      };
    });
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data mahasiswa",
      mapResult
    );
  } catch (error) {
    console.log("Error in getMahasiswaSkripsiVerified:", error);
  }
};
