import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Storage } from "@google-cloud/storage";
import path from "path";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import { FieldValue } from "@google-cloud/firestore";
dotenv.config();
const saltRounds = 15;

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.BUCKET_KEY,
});

export const registerMahasiswa = async (req, res) => {
  try {
    const { nim, nama, email, jurusan, semester, status_kelulusan, password } =
      req.body;
    const cekNim = await db
      .collection("mahasiswa")
      .where("nim", "==", nim)
      .get();

    if (!cekNim.empty) {
      return res.status(400).send({
        message: "NIM sudah terdaftar",
      });
    }
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("mahasiswa");
    const data = {
      nim,
      nama,
      jurusan,
      email,
      semester,
      status_kelulusan,
      password: hashPassword,
    };
    const snapshot = await query.where("nim", "==", nim).get();
    if (!snapshot.empty) {
      return res.status(400).send({
        message: "NIM sudah terdaftar",
      });
    }
    const result = await query.add(data);
    if (!result) {
      return res.status(400).send({
        message: "Register gagal",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Register berhasil",
    });
  } catch (error) {
    console.log("Error in registerMahasiswa:", error);
  }
};

export const loginMahasiswa = async (req, res) => {
  try {
    const { nim, password } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("nim", "==", nim).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "NIM tidak terdaftar",
      });
    }
    const userData = snapshot.docs[0].data();
    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.status(400).send({
        message: "Password salah",
      });
    }
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1d" },
    );
    res.set("Authorization", `Bearer ${token}`);
    res.status(200).send({
      status: "success",
      message: "Login berhasil",
      data: {
        id: snapshot.docs[0].id,
        token,
      },
    });
  } catch (error) {
    console.error("Error in loginMahasiswa:", error);
  }
};

export const checkLoginMahasiswa = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Data ditemukan",
    });
  } catch (error) {
    console.log("Error in checkLoginMahasiswa:", error);
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
    const { pembimbing1, pembimbing2, penguji, judul_skripsi, abstract } =
      req.body;
    const checkSkripsi = await db.collection("mahasiswa").doc(id).get();
    if (checkSkripsi.data().skripsi) {
      if (checkSkripsi.data().skripsi.status === "Terverifikasi") {
        return res.status(400).send({
          message: "Skripsi sudah diupload dan telah terverifikasi",
        });
      }
      if (checkSkripsi.data().skripsi.status === "proses") {
        return res.status(400).send({
          message: "Skripsi sudah diupload, Mohon tunggu konfirmasi dari admin",
        });
      }
    }
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const blob = bucket.file(id + path.extname(file.name));
    const blobStream = blob.createWriteStream();
    blobStream.on("error", (err) => {
      console.log(err);
    });
    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      const query = db.collection("mahasiswa").doc(id);
      const data = {
        skripsi_url: publicUrl,
        pembimbing1,
        pembimbing2,
        penguji,
        judul_skripsi,
        abstract,
        tanggal_upload: FieldValue.serverTimestamp(),
        status: "proses",
      };
      const result = await query.update({
        skripsi: data,
      });
      if (!result) {
        return res.status(400).send({
          message: "Gagal upload skripsi",
        });
      }
      res.status(200).send({
        status: "success",
        message: "Skripsi berhasil diupload",
        data: {
          skripsi: publicUrl,
        },
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
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const filterResult = snapshot.docs.filter(
      (item) => item.data().skripsi.status === "Terverifikasi",
    );
    const result = filterResult.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const mapData = result.map((item) => ({
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      judul_skripsi: item.skripsi.judul_skripsi,
    }));
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log("Error in getHalfSkripsi:", error);
  }
};

export const getSkripsiStatus = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
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
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log("Error in getSkripsiStatus:", error);
  }
};

export const getSkripsiById = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();
    const mapData = {
      id: snapshot.id,
      nama: data.nama,
      jurusan: data.jurusan,
      judul_skripsi: data.skripsi.judul_skripsi,
      abstract: data.skripsi.abstract,
      skripsi_url: data.skripsi.skripsi_url,
      pembimbing1: data.skripsi.pembimbing1,
      pembimbing2: data.skripsi.pembimbing2,
      penguji: data.skripsi.penguji,
    };
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log("Error in getSkripsiById:", error);
  }
};
export const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();

    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data profile",
      data,
    });
  } catch (error) {
    console.log("Error in getProfile:", error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { nim, nama, jurusan, semester, status_kelulusan } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();
    const mapingData = {
      nim: data.nim,
      nama: data.nama,
      jurusan: data.jurusan,
      semester: data.semester,
      status_kelulusan: data.status_kelulusan,
    };
    const result = await query.update({
      nim: nim || mapingData.nim,
      nama: nama || mapingData.nama,
      jurusan: jurusan || mapingData.jurusan,
      semester: semester || mapingData.semester,
      status_kelulusan: status_kelulusan || mapingData.status_kelulusan,
    });
    if (!result) {
      return res.status(400).send({
        message: "Gagal update profile",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Berhasil update profile",
    });
  } catch (error) {
    console.log("Error in updateProfile:", error);
  }
};

export const getSkripsiByJurusan = async (req, res) => {
  try {
    const { jurusan } = req.params;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("jurusan", "==", jurusan).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const filterResult = result.filter((item) => item.skripsi);
    const mapData = filterResult.map((item) => ({
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      judul_skripsi: item.skripsi.judul_skripsi,
    }));
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
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

    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const filterResult = result.filter((item) => item.skripsi);
    const mapData = filterResult.map((item) => ({
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      judul_skripsi: item.skripsi.judul_skripsi,
    }));
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
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
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();
    const checkPassword = bcrypt.compareSync(old_password, data.password);
    if (!checkPassword) {
      return res.status(400).send({
        message: "Password salah",
      });
    }
    const hashPassword = bcrypt.hashSync(new_password, saltRounds);
    const result = await query.update({
      password: hashPassword,
    });
    if (!result) {
      return res.status(400).send({
        message: "Gagal update password",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Berhasil update password",
    });
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
    res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data dosen",
      data: result,
    });
  } catch (error) {
    console.log("Error in getDosenByJurusan:", error);
  }
};

export const lupaPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    });
    const DOMAIN =
      process.env.MAILGUN_DOMAIN || "sandbox-yourkeyhere.mailgun.org";
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Email Tidak terdaftar",
      });
    }
    const RandomNumberOtp = Math.floor(1000 + Math.random() * 9000);
    const messageData = {
      from: "info@RepositoryFEBUndana",
      to: email,
      subject: "OTP Reset Password",
      html: `<html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
          .container {
            width: 80%;
            margin: 0 auto;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
          }
          .main {
            padding: 20px;
            text-align: center;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img
              src="https://feb.undana.ac.id/wp-content/uploads/2023/02/LOGO-FEB-black.png"
              width="400"
              alt="FEB UNDANA"
            />
            <h1>Sistem Informasi Repository Skripsi FEB UNDANA</h1>
            <div style="margin-top: 70px">
              <p>Kode OTP untuk reset password anda adalah:</p>
              <h2>${RandomNumberOtp}</h2>
              <p>Gunakan kode OTP diatas untuk mereset password anda.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 Sistem Informasi Repository Skripsi FEB UNDANA</p>
          </div>
        </div>
      </body>
    </html>
    `,
    };
    client.messages.create(DOMAIN, messageData);
    db.collection("mahasiswa").doc(snapshot.docs[0].id).update({
      otp: RandomNumberOtp,
    });
    res.status(200).send({
      status: "success",
      message: "Berhasil mengirim kode OTP",
    });
  } catch (error) {
    console.log("Error in lupaPassword:", error);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Email tidak terdaftar",
      });
    }
    const data = snapshot.docs[0].data();
    if (data.otp != otp) {
      return res.status(400).send({
        message: "Kode OTP Tidak Valid",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Kode OTP Valid",
    });
  } catch (error) {
    console.log("Error in verifyOtp:", error);
  }
};

export const resetpassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Email tidak valid",
      });
    }
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const result = await snapshot.docs[0].ref.update({
      password: hashPassword,
      otp: FieldValue.delete(),
    });
    if (!result) {
      return res.status(400).send({
        message: "Gagal reset password",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Berhasil reset password",
    });
  } catch (error) {
    console.log("Error in resetpassword:", error);
  }
};
