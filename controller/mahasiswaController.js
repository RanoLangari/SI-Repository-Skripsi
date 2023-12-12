import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Storage } from "@google-cloud/storage";
import path from "path";
dotenv.config();
const saltRounds = 15;

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.BUCKET_KEY,
});

export const registerMahasiswa = async (req, res) => {
  try {
    const {
      nim,
      nama,
      jurusan,
      semester,
      status_kelulusan,
      password,
      confirm_password,
    } = req.body;
    if (
      !nim ||
      !nama ||
      !jurusan ||
      !semester ||
      !status_kelulusan ||
      !password ||
      !confirm_password
    ) {
      return res.status(400).send({
        message: "Data tidak lengkap",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).send({
        message: "Password tidak sama",
      });
    }
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("mahasiswa");
    const data = {
      nim,
      nama,
      jurusan,
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
    res.status(200).send({
      status: "success",
      message: "Register berhasil",
    });
  } catch (error) {
    console.log(error);
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
    const data = snapshot.docs[0].data();
    const checkPassword = bcrypt.compareSync(password, data.password);
    if (!checkPassword) {
      return res.status(400).send({
        message: "Password salah",
      });
    }
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
    // set header authorization
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
    console.log(error);
  }
};

export const uploadSkripsi = async (req, res) => {
  try {
    const file = req.files.file;
    const { id } = req.user;
    const { pembimbing1, pembimbing2, penguji, judul_skripsi } = req.body;
    if (!file) {
      return res.status(400).send({
        message: "Mohon Masukan FIle",
      });
    }
    if (!pembimbing1 || !pembimbing2 || !penguji || !judul_skripsi) {
      return res.status(400).send({
        message: "Data tidak lengkap",
      });
    }

    // upload file to google cloud storage
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
      };
      const result = await query.update(data);
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
    console.log(error);
  }
};

export const getSkripsi = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi_url", "!=", null).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const data = snapshot.docs.find((doc) => doc.id === id).data();
    const mapData = result.map((item) => ({
      nama: item.nama,
      jurusan: item.jurusan,
      skripsi_url: item.skripsi_url,
      pembimbing1: item.pembimbing1,
      pembimbing2: item.pembimbing2,
      penguji: item.penguji,
      judul_skripsi: item.judul_skripsi,
    }));

    if (!data) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    res.render("dashboard", {
      data: mapData,
    });
  } catch (error) {
    console.log(error);
  }
};
