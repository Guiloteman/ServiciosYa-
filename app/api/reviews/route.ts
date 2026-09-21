import { NextResponse } from 'next/server'
import { ensureDatabaseSchema, getSqlPool } from '@/lib/sql'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const serviceId = Number(body?.serviceId ?? 0)
    const rating = Number(body?.rating ?? 0)
    const comment = String(body?.comment ?? '').trim()

    if (!serviceId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Selecciona una calificación entre 1 y 5 estrellas.' }, { status: 400 })
    }

    await ensureDatabaseSchema()
    const pool = await getSqlPool()
    const service = await pool
      .request()
      .input('serviceId', serviceId)
      .query("SELECT TOP 1 Id FROM dbo.Services WHERE Id = @serviceId AND Status = 'active'")

    if (!service.recordset?.length) {
      return NextResponse.json({ error: 'El servicio no está disponible.' }, { status: 404 })
    }

    const result = await pool
      .request()
      .input('serviceId', serviceId)
      .input('rating', rating)
      .input('comment', comment || null)
      .query(`
        INSERT INTO dbo.Reviews (ServiceId, UserId, Rating, Comment)
        OUTPUT INSERTED.Id, INSERTED.ServiceId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt
        VALUES (@serviceId, NULL, @rating, @comment)
      `)

    return NextResponse.json({ ok: true, review: result.recordset?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'No se pudo guardar la calificación.' }, { status: 500 })
  }
}
