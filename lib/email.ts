import nodemailer from 'nodemailer'

const smtpUser = process.env.SMTP_USER || 'higieneyseguridad036@gmail.com'
const smtpPassword = process.env.SMTP_PASSWORD

export async function sendAccountConfirmationEmail({
  name,
  email,
}: {
  name: string
  email: string
}) {
  if (!smtpPassword) {
    console.warn('SMTP_PASSWORD not configured. Skipping account confirmation email.')
    return false
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  })

  await transporter.sendMail({
    from: `ServiciosYa <${smtpUser}>`,
    to: email,
    subject: 'Confirmación de registro - ServiciosYa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Bienvenido/a, ${name}!</h2>
        <p>Tu cuenta en ServiciosYa ha sido creada correctamente.</p>
        <p>Ya puedes iniciar sesión con tu correo electrónico y la contraseña que elegiste durante el registro.</p>
        <p><strong>Correo:</strong> ${email}</p>
        <p>Gracias por confiar en nosotros.</p>
        <p>Saludos,<br />Equipo ServiciosYa</p>
      </div>
    `,
  })

  return true
}
