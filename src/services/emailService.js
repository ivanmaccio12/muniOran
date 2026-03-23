import nodemailer from 'nodemailer';

const MOCK_MODE = !process.env.SMTP_HOST;

const createTransport = () => {
  if (MOCK_MODE) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransport();
const FROM = process.env.SMTP_FROM || 'Municipalidad de Orán <noreply@munioran.gob.ar>';

export const sendEmail = async ({ to, subject, text, html }) => {
  if (MOCK_MODE) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL MOCK] Body: ${text}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, text, html });
    console.log(`[EMAIL] Enviado a ${to}: ${subject}`);
  } catch (e) {
    console.error(`[EMAIL ERROR] No se pudo enviar a ${to}:`, e.message);
  }
};

export const sendAssignmentEmail = async (user, reclamo) => {
  if (!user?.email) return;
  const subject = `Reclamo asignado: ${reclamo.id}`;
  const text = [
    `Hola ${user.nombre},`,
    ``,
    `Se te asignó el siguiente reclamo:`,
    ``,
    `ID: ${reclamo.id}`,
    `Motivo: ${reclamo.motivo}`,
    `Descripción: ${reclamo.descripcion}`,
    `Dirección: ${reclamo.direccion}${reclamo.barrio ? ` (${reclamo.barrio})` : ''}`,
    `Ciudadano: ${reclamo.nombre_apellido}`,
    ``,
    `Ingresá al sistema para ver el detalle y actualizar el estado.`,
    ``,
    `Municipalidad de San Ramón de la Nueva Orán`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a5276">Reclamo asignado</h2>
      <p>Hola <strong>${user.nombre}</strong>,</p>
      <p>Se te asignó el siguiente reclamo:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f2f3f4;font-weight:bold">ID</td><td style="padding:8px">${reclamo.id}</td></tr>
        <tr><td style="padding:8px;background:#f2f3f4;font-weight:bold">Motivo</td><td style="padding:8px">${reclamo.motivo}</td></tr>
        <tr><td style="padding:8px;background:#f2f3f4;font-weight:bold">Descripción</td><td style="padding:8px">${reclamo.descripcion}</td></tr>
        <tr><td style="padding:8px;background:#f2f3f4;font-weight:bold">Dirección</td><td style="padding:8px">${reclamo.direccion}${reclamo.barrio ? ` (${reclamo.barrio})` : ''}</td></tr>
        <tr><td style="padding:8px;background:#f2f3f4;font-weight:bold">Ciudadano</td><td style="padding:8px">${reclamo.nombre_apellido}</td></tr>
      </table>
      <p>Ingresá al sistema para ver el detalle y actualizar el estado.</p>
      <p style="color:#7f8c8d;font-size:12px">Municipalidad de San Ramón de la Nueva Orán</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, text, html });
};
