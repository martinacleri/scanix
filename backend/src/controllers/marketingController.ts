import { Request, Response } from 'express';
import { sendEmail } from '../config/mailer'; // Asegurate de la ruta correcta

const PRIMARY_COLOR = "#3b82f6";
const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Helper para generar el HTML con el diseño de Ticket
const generateMarketingTemplate = (title: string, message: string, name?: string) => {
    return `
    <div style="font-family: ${FONT_FAMILY}; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        
        <div style="background-color: ${PRIMARY_COLOR}; padding: 30px 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; letter-spacing: 1px; font-size: 24px;">SCANIX</h2>
            <p style="color: #eff6ff; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">${title}</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="color: #4b5563; margin-bottom: 20px; font-size: 16px;">
                ${name ? `<strong>¡Hola ${name}!</strong> 👋` : '<strong>¡Hola!</strong> 👋'}
            </p>
            
            <div style="color: #374151; line-height: 1.6; font-size: 16px;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #bae6fd;">
                <span style="color: #0369a1; font-size: 11px; text-transform: uppercase; font-weight: bold;">
                    ¡Te esperamos en la sucursal!
                </span>
                <div style="color: #0c4a6e; font-size: 16px; font-weight: bold; margin-top: 5px;">
                    Aprovechá estos descuentos
                </div>
            </div>

            <div style="border-top: 2px solid #f3f4f6; margin-top: 20px;"></div>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Recibiste esto por ser parte de la comunidad SCANIX.<br>
            </p>
        </div>
    </div>
    `;
};

export const sendMassiveCampaign = async (req: Request, res: Response) => {
  try {
    const { recipients, subject, message } = req.body; 
    // Ahora recipients es un array de objetos: { email: string, name: string }[]

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "No hay destinatarios válidos." });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: "Falta asunto o mensaje." });
    }

    // Enviamos en paralelo, PERO generando el template individualmente
    const sendPromises = recipients.map(client => {
      // 1. Generamos el HTML personalizado para ESTE cliente (usando su nombre real)
      const personalHtml = generateMarketingTemplate(
          "Novedades y Ofertas", 
          message, 
          client.name // <--- ¡AQUÍ ESTÁ LA MAGIA! Recuperamos el nombre
      );

      // 2. Enviamos
      return sendEmail(client.email, subject, personalHtml);
    });

    // Esperamos a que todos terminen
    await Promise.all(sendPromises);

    return res.status(200).json({ 
      success: true, 
      message: `Campaña personalizada enviada a ${recipients.length} destinatarios.` 
    });

  } catch (error) {
    console.error("Error campaña masiva:", error);
    return res.status(500).json({ error: "Error del servidor." });
  }
};