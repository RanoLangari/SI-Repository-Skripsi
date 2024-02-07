import { FieldValue } from "@google-cloud/firestore";
import storage from "../utils/storege.js";
import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
import Mailgun from "mailgun.js";
import FormData from "form-data";
const saltRounds = 10;

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = db.collection("admin").where("username", "==", username);
    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.status(400).send({
        status: "error",
        message: "Username tidak terdaftar",
      });
    }
    const user = snapshot.docs[0].data();
    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).send({
        status: "error",
        message: "Password salah",
      });
    }
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1d" },
    );
    res.status(200).send({
      status: "success",
      message: "Login berhasil",
      token,
    });
  } catch (error) {
    console.log(error);
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, confirm_password } = req.body;
    if (password !== confirm_password) {
      return res.status(400).send({
        message: "Password tidak sama",
      });
    }
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("admin");
    const data = {
      username,
      email,
      password: hashPassword,
    };
    const snapshot = await query.where("email", "==", email).get();
    if (!snapshot.empty) {
      return res.status(400).send({
        message: "Email sudah terdaftar",
      });
    }
    const result = await query.add(data);
    res.status(200).send({
      status: "success",
      message: "Admin berhasil ditambahkan",
      data: {
        id: result.id,
        ...data,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const checkLoginAdmin = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    res.status(200).send({
      status: "success",
      message: "Data Ditemukan",
    });
  } catch (error) {
    console.log(error);
  }
};

export const getAdmin = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    res.status(200).send({
      status: "success",
      message: "Data Ditemukan",
      data: snapshot.data(),
    });
  } catch (error) {
    console.log(error);
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
    res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data mahasiswa",
      data: result,
    });
  } catch (error) {
    console.log(error);
  }
};

export const KonfirmasiSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    await query.update({
      "skripsi.status": "Terverifikasi",
    });
    res.status(200).send({
      status: "success",
      message: "Status skripsi Terverifikasi",
    });
  } catch (error) {
    console.log(error);
  }
};

export const deleteSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const file = bucket.file(`${id}.pdf`);
    await file.delete();
    await query.update({
      skripsi: FieldValue.delete(),
    });

    res.status(200).send({
      status: "success",
      message: "Status skripsi Ditolak",
    });
  } catch (error) {
    console.log(error);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { old_password, new_password } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    const user = snapshot.data();
    const isPasswordMatch = bcrypt.compareSync(old_password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).send({
        status: "error",
        message: "Password salah",
      });
    }
    const hashPassword = bcrypt.hashSync(new_password, saltRounds);
    await query.update({
      password: hashPassword,
    });
    res.status(200).send({
      status: "success",
      message: "Password berhasil diubah",
    });
  } catch (error) {
    console.log(error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { username, email } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Data tidak ditemukan",
      });
    }
    await query.update({
      username,
      email,
    });
    res.status(200).send({
      status: "success",
      message: "Profile berhasil diubah",
    });
  } catch (error) {
    console.log(error);
  }
};

export const getDosen = async (req, res) => {
  try {
    const query = db.collection("dosen");
    const snapshot = await query.get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data dosen",
      data: result,
    });
  } catch (error) {
    console.log(error);
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
    res.status(200).send({
      status: "success",
      message: "Dosen berhasil ditambahkan",
      data: {
        id: result.id,
        ...data,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const deleteDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Dosen tidak ditemukan",
      });
    }
    await query.delete();
    res.status(200).send({
      status: "success",
      message: "Dosen berhasil dihapus",
    });
  } catch (error) {
    console.log(error);
  }
};

export const editDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama, jurusan } = req.body;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        status: "error",
        message: "Dosen tidak ditemukan",
      });
    }
    await query.update({
      nama,
      jurusan,
    });
    res.status(200).send({
      status: "success",
      message: "Dosen berhasil diupdate",
    });
  } catch (error) {
    console.log(error);
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
    const query = db.collection("admin");
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
    db.collection("admin").doc(snapshot.docs[0].id).update({
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
    const query = db.collection("admin");
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
    const query = db.collection("admin");
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
    res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data mahasiswa",
      data: mapResult,
    });
  } catch (error) {
    console.log("Error in getMahasiswaSkripsiVerified:", error);
  }
};
