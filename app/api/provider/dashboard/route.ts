import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSqlPool } from '@/lib/sql'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'provider') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const pool = await getSqlPool()

    const providerResult = await pool
      .request()
      .input('email', session.email)
      .query('SELECT TOP 1 Id, Name, Email FROM dbo.Users WHERE Email = @email')

    const provider = providerResult.recordset?.[0]

    if (!provider) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const statsResult = await pool
      .request()
      .input('providerId', provider.Id)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.Services WHERE ProviderId = @providerId AND Status IN ('active', 'paused')) AS activeServices,
          (SELECT COUNT(*) FROM dbo.ServiceRequests sr INNER JOIN dbo.Services s ON s.Id = sr.ServiceId WHERE s.ProviderId = @providerId) AS requestsCount,
          (SELECT ISNULL(AVG(r.Rating), 0) FROM dbo.Reviews r INNER JOIN dbo.Services s ON s.Id = r.ServiceId WHERE s.ProviderId = @providerId) AS averageRating,
          (SELECT ISNULL(SUM(Price), 0) FROM dbo.Services WHERE ProviderId = @providerId AND Status = 'active') AS monthlyRevenue
      `)

    const requestsResult = await pool
      .request()
      .input('providerId', provider.Id)
      .query(`
        SELECT TOP 5
          sr.Id,
          sr.ClientName,
          sr.ClientPhone,
          sr.ClientEmail,
          sr.Message,
          sr.Status,
          sr.CreatedAt,
          s.Title AS serviceTitle,
          s.Price AS servicePrice
        FROM dbo.ServiceRequests sr
        INNER JOIN dbo.Services s ON s.Id = sr.ServiceId
        WHERE s.ProviderId = @providerId
        ORDER BY sr.CreatedAt DESC
      `)

    return NextResponse.json({
      provider: {
        id: provider.Id,
        name: provider.Name,
        email: provider.Email,
      },
      stats: statsResult.recordset?.[0] ?? {
        activeServices: 0,
        requestsCount: 0,
        averageRating: 0,
        monthlyRevenue: 0,
      },
      requests: requestsResult.recordset ?? [],
    })
  } catch (error) {
    console.error('Provider dashboard error:', error)
    return NextResponse.json({ error: 'No se pudo cargar el panel del prestador.' }, { status: 500 })
  }
}
