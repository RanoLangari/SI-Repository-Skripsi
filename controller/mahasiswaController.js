import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import storage from "../utils/storege.js";
import path from "path";
import { FieldValue } from "@google-cloud/firestore";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import EmailService from "../utils/emailService.js";
import Helper from "../utils/helper.js";

const emailService = new EmailService();
const helper = new Helper();
dotenv.config();
const saltRounds = 8;

export const loginMahasiswa = async (req, res) => {
  try {
    const { nim, password } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("nim", "==", Number(nim)).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "NIM tidak terdaftar");
    const userData = snapshot.docs[0].data();
    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect)
      return helper.responseError(res, 400, "Password salah");
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );
    return helper.response(res, 200, "Login berhasil", { token });
  } catch (error) {
    console.error("Error in loginMahasiswa:", error);
  }
};

export const uploadSkripsi = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).send({
        message: "Mohon Masukan FIle",
      });
    }
    const file = req.files.file;
    const { id } = req.user;
    const { peminatan, abstract } = req.body;
    if (!file.mimetype.includes("pdf"))
      return helper.responseError(res, 400, "File harus berformat PDF");
    const checkSkripsi = await db.collection("mahasiswa").doc(id).get();
    if (!checkSkripsi.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    if (!checkSkripsi.data().skripsi) {
      return helper.responseError(
        res,
        400,
        "Data Skripsi Anda Belum DImasukan Oleh Admin Kedalam Sistem, Mohon Hubungi Admin"
      );
    }
    if (checkSkripsi.data().skripsi.status === "Terverifikasi") {
      return helper.responseError(
        res,
        400,
        "Skripsi sudah diupload dan telah terverifikasi"
      );
    }
    if (checkSkripsi.data().skripsi.status === "proses") {
      return helper.responseError(
        res,
        400,
        "Skripsi sudah diupload, Mohon tunggu konfirmasi dari admin"
      );
    }
    const pdfDoc = await PDFDocument.load(file.data);
    const image = await pdfDoc.embedPng(
      await fs.promises.readFile(
        path.join(process.cwd(), "public", "Logo_Undana.png")
      )
    );
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawImage(image, {
        y: height / 2 - height / 4,
        x: width / 2 - width / 4,
        width: width / 2,
        height: height / 2,
        opacity: 0.1,
      });
    }
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);
    file.data = buffer;
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const blob = bucket.file(id + path.extname(file.name));
    const blobStream = blob.createWriteStream();
    blobStream.on("error", (err) => {
      console.log(err);
    });
    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      const query = db.collection("mahasiswa").doc(id);
      const result = await query.update({
        skripsi: {
          judul_skripsi: checkSkripsi.data().skripsi.judul_skripsi,
          pembimbing1: checkSkripsi.data().skripsi.pembimbing1,
          pembimbing2: checkSkripsi.data().skripsi.pembimbing2,
          penguji: checkSkripsi.data().skripsi.penguji,
          skripsi_url: publicUrl,
          peminatan,
          abstract,
          tanggal_upload: FieldValue.serverTimestamp(),
          status: "proses",
        },
      });
      if (!result)
        return helper.responseError(res, 400, "Gagal upload skripsi");
      return helper.responseSuccess(res, 200, "Skripsi berhasil diupload", {
        publicUrl,
      });
    });
    blobStream.end(file.data);
  } catch (error) {
    console.log("Error in uploadSkripsi:", error);
  }
};

export const getHalfSkripsi = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi", "!=", null).get();
    if (snapshot.empty)
      return helper.responseError(res, 200, "Data tidak ditemukan");
    const filterResult = snapshot.docs
      .filter((item) => item.data().skripsi.status === "Terverifikasi")
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .map((item) => ({
        id: item.id,
        nama: item.nama,
        jurusan: item.jurusan,
        judul_skripsi: item.skripsi.judul_skripsi,
        peminatan: !item.skripsi.peminatan
          ? "Belum Diisi"
          : item.skripsi.peminatan,
      }));
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      filterResult
    );
  } catch (error) {
    console.log("Error in getHalfSkripsi:", error);
  }
};

export const getSkripsiStatus = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    let item = snapshot.data();
    if (!item.skripsi) {
      item = {
        ...item,
        skripsi: {
          status: "Belum Upload",
        },
      };
    }
    const mapData = {
      status_skripsi: item.skripsi.status,
      judul_skripsi: item.skripsi.judul_skripsi,
      abstract: item.skripsi.abstract,
      skripsi_url: item.skripsi.skripsi_url,
      pembimbing1: item.skripsi.pembimbing1,
      pembimbing2: item.skripsi.pembimbing2,
      penguji: item.skripsi.penguji,
    };
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      mapData
    );
  } catch (error) {
    console.log("Error in getSkripsiStatus:", error);
  }
};

export const getSkripsiById = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    const mapData = {
      id: snapshot.id,
      nama: data.nama,
      jurusan: data.jurusan,
      judul_skripsi: data.skripsi.judul_skripsi,
      abstract: data.skripsi.abstract,
      pembimbing1: data.skripsi.pembimbing1,
      pembimbing2: data.skripsi.pembimbing2,
      penguji: data.skripsi.penguji,
      peminatan: !data.skripsi.peminatan
        ? "Belum Diisi"
        : data.skripsi.peminatan,
    };
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      mapData
    );
  } catch (error) {
    console.log("Error in getSkripsiById:", error);
  }
};

export const getUrlSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) return helper(res, 200, "Data tidak ditemukan");
    const data = snapshot.data();
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      data.skripsi.skripsi_url
    );
  } catch (error) {
    console.log("Error in getUrlSkripsi:", error);
  }
};

export const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    const mapData = {
      nim: Number(data.nim),
      nama: data.nama,
      jurusan: data.jurusan,
      semester: data.semester,
      status_kelulusan: data.status_kelulusan,
      email: data.email,
      status_skripsi: data.skripsi ? data.skripsi.status : "Belum Upload",
      alasan_tolak: data.skripsi ? data.skripsi.alasan : "",
    };

    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data profile",
      mapData
    );
  } catch (error) {
    console.log("Error in getProfile:", error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { nim, nama, jurusan, semester, email } = req.body;
    const checkNim = await db
      .collection("mahasiswa")
      .where("nim", "==", Number(nim))
      .get();
    if (!checkNim.empty) {
      if (checkNim.docs[0].id !== id)
        return helper.responseError(res, 400, "NIM sudah terdaftar");
    }
    const checkEmail = await db
      .collection("mahasiswa")
      .where("email", "==", email)
      .get();
    if (!checkEmail.empty) {
      if (checkEmail.docs[0].id !== id)
        return helper.responseError(res, 400, "Email sudah terdaftar");
    }

    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    const mapingData = {
      nim: Number(data.nim),
      nama: data.nama,
      jurusan: data.jurusan,
      semester: data.semester,
      email: data.email,
    };
    const result = await query.update({
      nim: Number(nim) || mapingData.nim,
      nama: nama || mapingData.nama,
      jurusan: jurusan || mapingData.jurusan,
      semester: semester || mapingData.semester,
      email: email || mapingData.email,
    });
    if (!result) return helper.responseError(res, 400, "Gagal update profile");
    return helper.responseSuccess(res, 200, "Berhasil update profile");
  } catch (error) {
    console.log("Error in updateProfile:", error);
  }
};

export const getSkripsiByJurusan = async (req, res) => {
  try {
    const { jurusan, peminatan } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("jurusan", "==", jurusan).get();
    if (snapshot.empty) {
      return helper.responseError(res, 400, "Data tidak ditemukan");
    }
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (item) =>
          item.skripsi &&
          item.skripsi.status === "Terverifikasi" &&
          (peminatan === "" || item.skripsi.peminatan === peminatan)
      )
      .map((item) => ({
        id: item.id,
        nama: item.nama,
        jurusan: item.jurusan,
        judul_skripsi: item.skripsi.judul_skripsi,
        peminatan: !item.skripsi.peminatan
          ? "Belum Diisi"
          : item.skripsi.peminatan,
      }));
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      result
    );
  } catch (error) {
    console.log("Error in getSkripsiByJurusan:", error);
  }
};

export const getSkripsiByDate = async (req, res) => {
  try {
    const { tanggal_awal, tanggal_akhir } = req.query;
    // convert tanggal_awal dan tanggal_akhir ke format timestamp
    const timestamp_awal = new Date(tanggal_awal).getTime();
    const timestamp_akhir = new Date(tanggal_akhir).getTime();
    // convert timestamp ke format firestore
    const convert_awal = new Date(timestamp_awal);
    const convert_akhir = new Date(timestamp_akhir);
    const query = db.collection("mahasiswa");
    const snapshot = await query
      .where("skripsi.tanggal_upload", ">=", convert_awal)
      .where("skripsi.tanggal_upload", "<=", convert_akhir)
      .get();

    if (snapshot.empty)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => item.skripsi && item.skripsi.status === "Terverifikasi")
      .map((item) => ({
        id: item.id,
        nama: item.nama,
        jurusan: item.jurusan,
        judul_skripsi: item.skripsi.judul_skripsi,
        peminatan: !item.skripsi.peminatan
          ? "Belum Diisi"
          : item.skripsi.peminatan,
      }));
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      result
    );
  } catch (error) {
    console.log("Error in getSkripsiByDate:", error);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { old_password, new_password } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    const checkPassword = bcrypt.compareSync(old_password, data.password);
    if (!checkPassword) return helper.responseError(res, 400, "Password salah");
    const hashPassword = bcrypt.hashSync(new_password, saltRounds);
    const result = await query.update({
      password: hashPassword,
    });
    if (!result) return helper.responseError(res, 400, "Gagal update password");
    return helper.responseSuccess(res, 200, "Berhasil update password");
  } catch (error) {
    console.log("Error in changePassword:", error);
  }
};

export const getDosenByJurusan = async (req, res) => {
  try {
    const { jurusan } = req.body;
    const query = db.collection("dosen");
    const snapshot = await query.where("jurusan", "==", jurusan).get();
    const result = snapshot.docs.map((doc) => ({
      nama: doc.data().nama,
    }));
    return helper.response(res, 200, "Berhasil mendapatkan data dosen", result);
  } catch (error) {
    console.log("Error in getDosenByJurusan:", error);
  }
};

export const lupaPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak valid");
    const RandomNumberOtp = Math.floor(1000 + Math.random() * 9000);
    emailService.sendOtpResetPasswordEmail(email, RandomNumberOtp);
    db.collection("mahasiswa").doc(snapshot.docs[0].id).update({
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
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak terdaftar");
    const data = snapshot.docs[0].data();
    if (data.otp != otp)
      return helper.responseError(res, 400, "Kode OTP Tidak Valid");
    return helper.responseSuccess(res, 200, "Kode OTP Valid");
  } catch (error) {
    console.log("Error in verifyOtp:", error);
  }
};

export const resetpassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = db.collection("mahasiswa");
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
