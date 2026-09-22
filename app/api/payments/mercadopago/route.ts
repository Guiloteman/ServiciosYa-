import { NextResponse } from 'next/server'
import { Preference, MercadoPagoConfig } from 'mercadopago'
import { ensureDatabaseSchema, getSqlPool } from '@/lib/sql'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const serviceId = Number(body?.serviceId ?? 0)
    const clientName = String(body?.clientName ?? '').trim()
    const clientPhone = String(body?.clientPhone ?? '').trim() || 'indefinido'
    const clientEmail = String(body?.clientEmail ?? '').trim() || 'indefinido'
    const address = String(body?.address ?? '').trim()

    if (!serviceId || !clientName || !address) {
      return NextResponse.json({ error: 'Indica tu nombre y dirección.' }, { status: 400 })
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta la variable MERCADO_PAGO_ACCESS_TOKEN en el entorno.' },
        { status: 500 },
      )
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()

    const serviceResult = await pool
      .request()
      .input('serviceId', serviceId)
      .query("SELECT TOP 1 Id, Title, Price, ProviderId FROM dbo.Services WHERE Id = @serviceId AND Status = 'active'")

    const service = serviceResult.recordset?.[0]

    if (!service) {
      return NextResponse.json({ error: 'El servicio no existe o ya no está disponible.' }, { status: 404 })
    }

    const unitPrice = Number(service.Price)

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json(
        { error: 'El servicio no tiene un precio válido para iniciar el pago.' },
        { status: 422 },
      )
    }

    const requestResult = await pool
      .request()
      .input('serviceId', serviceId)
      .input('clientName', clientName)
      .input('clientPhone', clientPhone)
      .input('clientEmail', clientEmail)
      .input('address', address)
      .input('message', `Solicitud para ${String(service.Title)}`)
      .input('paymentMethod', 'mercadopago')
      .query(`
        INSERT INTO dbo.ServiceRequests (ServiceId, ClientName, ClientPhone, ClientEmail, Address, Message, PaymentMethod, Status)
        OUTPUT INSERTED.Id, INSERTED.ServiceId, INSERTED.ClientName, INSERTED.ClientPhone, INSERTED.Address, INSERTED.Message, INSERTED.PaymentMethod, INSERTED.Status
        VALUES (@serviceId, @clientName, @clientPhone, @clientEmail, @address, @message, @paymentMethod, 'pending')
      `)

    const createdRequest = requestResult.recordset?.[0]

    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000').replace(/\/$/, '')

    const isPublicReturnUrl = /^https:\/\//i.test(baseUrl) && !/localhost|127\.0\.0\.1/i.test(baseUrl)

    const response = await preference.create({
      body: {
        items: [
          {
            id: `service-${serviceId}`,
            title: `Servicio: ${String(service.Title)}`,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: clientName,
          email: 'cliente@serviciosya.com',
        },
        payment_methods: {
          installments: 12,
        },
        ...(isPublicReturnUrl
          ? {
              back_urls: {
                success: `${baseUrl}/?payment=success`,
                failure: `${baseUrl}/?payment=failed`,
                pending: `${baseUrl}/?payment=pending`,
              },
              auto_return: 'approved' as const,
            }
          : {}),
        metadata: {
          serviceId: String(serviceId),
          requestId: createdRequest?.Id ? String(createdRequest.Id) : '0',
        },
      },
    })

    return NextResponse.json({
      ok: true,
      init_point: response.init_point || response.sandbox_init_point,
      requestId: createdRequest?.Id ?? null,
      service: {
        id: service.Id,
        title: service.Title,
        price: Number(service.Price),
      },
    })
  } catch (error) {
    console.error('Create Mercado Pago payment error:', error)

    const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''

    if (errorCode === 'ESOCKET' || errorCode === 'ETIMEOUT' || errorCode === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'No se pudo conectar con la base de datos. Verifica DB_SERVER, DB_PORT y las credenciales de SQL Server.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ error: 'No se pudo crear el pago con Mercado Pago.' }, { status: 500 })
  }
}
