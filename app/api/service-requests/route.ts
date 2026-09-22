import { NextResponse } from 'next/server'
import { ensureDatabaseSchema, getSqlPool } from '@/lib/sql'

export async function GET() {
  try {
    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const result = await pool.request().query(`
      SELECT sr.Id, sr.ServiceId, sr.ClientName, sr.ClientPhone, sr.ClientEmail, sr.Address, sr.Message, sr.Status, sr.CreatedAt,
             s.Title AS ServiceTitle,
             s.Description AS ServiceDescription,
             u.Name AS ProviderName
      FROM dbo.ServiceRequests sr
      INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
      INNER JOIN dbo.Users u ON u.Id = s.ProviderId
      ORDER BY sr.CreatedAt DESC
    `)

    return NextResponse.json({ requests: result.recordset ?? [] })
  } catch (error) {
    console.error('List service requests error:', error)
    return NextResponse.json({ error: 'No se pudieron cargar las solicitudes.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const serviceId = Number(body?.serviceId ?? 0)
    const clientName = String(body?.clientName ?? '').trim()
    const clientPhone = String(body?.clientPhone ?? '').trim() || 'indefinido'
    const clientEmail = String(body?.clientEmail ?? '').trim() || 'indefinido'
    const address = String(body?.address ?? '').trim()
    const message = String(body?.message ?? '').trim()
    const paymentMethod = body?.paymentMethod === 'mercadopago' ? 'mercadopago' : 'cash'

    if (!serviceId || !clientName || !address || !body?.paymentMethod) {
      return NextResponse.json({ error: 'Indica tu nombre, dirección y forma de pago.' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const serviceExists = await pool
      .request()
      .input('serviceId', serviceId)
      .query("SELECT TOP 1 Id FROM dbo.Services WHERE Id = @serviceId AND Status = 'active'")

    if (!serviceExists.recordset?.length) {
      return NextResponse.json({ error: 'El servicio no existe.' }, { status: 404 })
    }

    const result = await pool
      .request()
      .input('serviceId', serviceId)
      .input('clientName', clientName)
      .input('clientPhone', clientPhone)
      .input('clientEmail', clientEmail)
      .input('address', address)
      .input('message', message)
      .input('paymentMethod', paymentMethod)
      .query(`
        INSERT INTO dbo.ServiceRequests (ServiceId, ClientName, ClientPhone, ClientEmail, Address, Message, PaymentMethod, Status)
        OUTPUT INSERTED.Id, INSERTED.ServiceId, INSERTED.ClientName, INSERTED.ClientPhone, INSERTED.Address, INSERTED.Message, INSERTED.PaymentMethod, INSERTED.Status, INSERTED.CreatedAt
        VALUES (@serviceId, @clientName, @clientPhone, @clientEmail, @address, @message, @paymentMethod, 'pending')
      `)

    return NextResponse.json({ ok: true, request: result.recordset?.[0] })
  } catch (error) {
    console.error('Create service request error:', error)
    return NextResponse.json({ error: 'No se pudo enviar la solicitud.' }, { status: 500 })
  }
}
