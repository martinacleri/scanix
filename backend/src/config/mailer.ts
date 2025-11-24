import nodemailer from 'nodemailer';
import 'dotenv/config'; // <--- Esto carga las variables del archivo .env

const createTransporter = async () => {
  // Verificamos que las credenciales existan
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error("Faltan credenciales de correo en el archivo .env");
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL, // Lee del archivo .env
      pass: process.env.SMTP_PASSWORD // Lee del archivo .env
    }
  });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = await createTransporter();

    const info = await transporter.sendMail({
      from: '"SCANIX" <no-reply@scanix.com>',
      to,
      subject,
      html,
    });

    console.log("Mensaje enviado con éxito ID: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    // No lanzamos el error para que no rompa la respuesta al cliente si falla el mail
    // pero lo logueamos para saber qué pasó.
    return null; 
  }
};