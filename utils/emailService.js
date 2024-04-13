import Mailgun from "mailgun.js";
import FormData from "form-data";   

class EmailService {
  constructor() {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    });
    this.DOMAIN = process.env.MAILGUN_DOMAIN;
    this.fromEmail = process.env.MAIL_ADDRESSS;
  }

  async sendEmail(email, subject, html) {
    const messageData = {
      from: this.fromEmail,
      to: email,
      subject: subject,
      html: html,
    };
    this.client.messages.create(this.DOMAIN, messageData);
  }

  async sendOtpResetPasswordEmail(email, otp) {
    const html = `<html>
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
            <h2>${otp}</h2>
            <p>Gunakan kode OTP diatas untuk mereset password anda.</p>
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Sistem Informasi Repository Skripsi FEB UNDANA</p>
        </div>
      </div>
    </body>
  </html>
  `;
    await this.sendEmail(email, "OTP Reset Password", html);
  }

  async sendEmailSkripsiVerified(email){
    const html = `<html>
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
            <p>Skripsi Anda Telah Terverifikasi</p> 
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Sistem Informasi Repository Skripsi FEB UNDANA</p>
        </div>
      </div>
    </body>
  </html>
  `;
    await this.sendEmail(email, "Status Skripsi", html);
  }

  async sendEmailSkripsiReject(email){
    const html = `<html>
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
            <p>Skripsi Anda Telah Ditolak</p> 
            <p>Silahkan upload kembali skripsi anda</p>
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Sistem Informasi Repository Skripsi FEB UNDANA</p>
        </div>
      </div>
    </body>
  </html>
  `;
    await this.sendEmail(email, "Status Skripsi", html);
  }
}


export default EmailService;



