import db from "./dbFirestore.js";
import bcrypt from "bcrypt";
import exceljs from "exceljs";

const saltRounds = 8;

class Helper {
  response(res, status, message, data) {
    return res.status(status).send({
      message,
      data,
    });
  }
  responseError(res, status, message) {
    return res.status(status).send({
      message,
    });
  }
  responseSuccess(res, status, message) {
    return res.status(status).send({
      message,
    });
  }
  capitalizeFirstLetter(string) {
    return string
      .toLowerCase()
      .split(" ")
      .map((word) => {
        return word.toLowerCase().charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  async processExcelFileDataDosen(fileData) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(fileData);
    const worksheet = workbook.worksheets[0];
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 8) {
        const nama = this.capitalizeFirstLetter(row.values[8].toString());
        const jurusan = this.capitalizeFirstLetter(row.values[9].toString());
        const listJurusan = ["Manajemen", "Akuntansi", "Ekonomi Pembangunan"];
        if (!listJurusan.includes(jurusan)) {
          throw new Error(
            `Jurusan ${jurusan} pada dosen dengan nama ${nama} tidak valid. Mohon periksa kembali file excel anda`
          );
        }
        data.push({
          nama,
          jurusan: jurusan,
        });
      }
    });

    if (data.length === 0) {
      throw new Error(
        "Data dosen pada file excel tidak ditemukan, mohon periksa kembali file excel anda"
      );
    }
    return data;
  }
  async batchAddDataDosen(data) {
    const batch = db.batch();
    const query = db.collection("dosen");

    for (let item of data) {
      const docRef = query.doc();
      batch.set(docRef, item);
    }

    await batch.commit();
  }
  async processExcelFileDataMhs(fileData) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(fileData);
    const worksheet = workbook.worksheets[0];
    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 8) {
        let semester =
          currentYear - parseInt(`20${row.values[7]}`.substring(0, 4), 10);
        semester = Math.ceil(semester * (currentMonth > 6 ? 1.5 : 2));
        const jurusan = this.capitalizeFirstLetter(row.values[9].toString());
        const listJurusan = ["Manajemen", "Akuntansi", "Ekonomi Pembangunan"];
        if (!listJurusan.includes(jurusan)) {
          throw new Error(
            `Jurusan ${jurusan} pada NIM ${row.values[7]} tidak valid. Mohon periksa kembali file excel anda`
          );
        }
        const nama = this.capitalizeFirstLetter(row.values[8].toString());
        data.push({
          nim: row.values[7],
          nama,
          jurusan,
          password: bcrypt.hashSync(`FEB_${row.values[7]}`, saltRounds),
          status_kelulusan: "Belum Lulus",
          semester: semester.toString(),
        });
      }
    });

    return data;
  }

  async validateDataMhs(data) {
    for (let item of data) {
      if (!item.nim || !item.nama || !item.jurusan) {
        throw new Error(
          "Data tidak valid, mohon periksa kembali file excel anda"
        );
      }

      const checkNim = await db
        .collection("mahasiswa")
        .where("nim", "==", item.nim)
        .get();
      if (!checkNim.empty) {
        throw new Error(`NIM ${item.nim} sudah terdaftar`);
      }
    }
  }

  async batchAddDataMhs(data) {
    const batch = db.batch();
    const query = db.collection("mahasiswa");

    for (let item of data) {
      const docRef = query.doc();
      batch.set(docRef, item);
    }

    await batch.commit();
  }
  async processSkripsiFile(fileData) {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(fileData);
    const worksheet = workbook.worksheets[0];
    const data = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber !== 1) {
        const judul_skripsi = this.capitalizeFirstLetter(
          row.values[11].toString()
        );
        data.push({
          nim: row.values[7],
          pembimbing1: row.values[8],
          pembimbing2: row.values[9],
          penguji: row.values[10],
          judul_skripsi,
        });
      }
    });

    return data;
  }

  async updateSkripsiData(data) {
    const batch = db.batch();

    for (const item of data) {
      const query = db.collection("mahasiswa");
      const snapshot = await query.where("nim", "==", item.nim).get();
      if (snapshot.empty) {
        throw new Error(`NIM ${item.nim} tidak terdaftar dalam sistem`);
      }
      const result = snapshot.docs[0].data();
      if (result.skripsi) {
        throw new Error(
          `Data Skripsi Mahasiswa dengan NIM ${item.nim} Sudah Terdaftar`
        );
      }
      await query.doc(snapshot.docs[0].id).update({
        status_kelulusan: "Lulus",
        skripsi: {
          pembimbing1: item.pembimbing1,
          pembimbing2: item.pembimbing2,
          penguji: item.penguji,
          judul_skripsi: item.judul_skripsi,
        },
      });
    }

    await batch.commit();
  }
}

export default Helper;
