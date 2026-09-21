import crypto from 'node:crypto'
import sql from 'mssql'

export type DbUserRole = 'client' | 'provider'

export type DbUser = {
  id: number
  name: string
  email: string
  role: DbUserRole
  passwordHash: string
  passwordSalt: string
}

const baseSqlConfig: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'ServiciosYa',
  user: process.env.DB_USERNAME || 'api_user',
  password: process.env.DB_PASSWORD || 'Contraseña2026!',
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
  },
}

function getSqlConfig(): sql.config {
  const connectionString = process.env.DB_CONNECTION_STRING

  if (!connectionString) {
    return baseSqlConfig
  }

  const normalized = connectionString
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  const values: Record<string, string> = {}

  for (const part of normalized) {
    const index = part.indexOf('=')

    if (index === -1) {
      continue
    }

    const key = part.slice(0, index).trim().toLowerCase()
    const value = part.slice(index + 1).trim()
    values[key] = value
  }

  const server = values['data source'] || values['server'] || baseSqlConfig.server
  const database = values['initial catalog'] || values['database'] || baseSqlConfig.database
  const user = values['user id'] || values['uid'] || values['userid'] || baseSqlConfig.user
  const password = values['password'] || values['pwd'] || baseSqlConfig.password
  const encrypt = values['encrypt']?.toLowerCase() === 'true' || baseSqlConfig.options?.encrypt === true
  const trustServerCertificate =
    values['trustservercertificate']?.toLowerCase() === 'true' ||
    values['trust server certificate']?.toLowerCase() === 'true' ||
    true

  const hasExplicitCredentials = Boolean(
    values['user id'] || values['uid'] || values['userid'] || values['password'] || values['pwd'],
  )
  const useIntegratedSecurity =
    !hasExplicitCredentials &&
    (values['integrated security']?.toLowerCase() === 'true' || values['trusted_connection']?.toLowerCase() === 'true')

  const config = {
    server,
    database,
    user,
    password,
    port: Number(process.env.DB_PORT || 1433),
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
    },
    ...(useIntegratedSecurity
      ? {
          authentication: {
            type: 'ntlm',
            options: {
              domain: process.env.DB_DOMAIN || process.env.USERDOMAIN || 'GUILLE',
            },
          },
        }
      : {}),
  } as any

  if (useIntegratedSecurity) {
    delete config.user
    delete config.password
  }

  return config
}

let pool: sql.ConnectionPool | null = null

export function createPasswordHash(password: string, salt?: string) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha256').toString('hex')

  return {
    salt: generatedSalt,
    hash,
  }
}

export function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
}

export async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool(getSqlConfig())
  }

  if (pool.connected === false) {
    await pool.connect()
  }

  return pool
}

export async function ensureDatabaseSchema() {
  const connection = await getSqlPool()

  await connection.request().query(`
    IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Email NVARCHAR(200) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(128) NOT NULL,
        PasswordSalt NVARCHAR(64) NOT NULL,
        Role NVARCHAR(20) NOT NULL DEFAULT 'client',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    END
  `)

  await connection.request().query(`
    IF OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.ServiceRequests', N'PaymentMethod') IS NULL
    BEGIN
      ALTER TABLE dbo.ServiceRequests ADD PaymentMethod NVARCHAR(20) NULL
    END
  `)

  await connection.request().query(`
    IF OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.ServiceRequests', N'Address') IS NULL
    BEGIN
      ALTER TABLE dbo.ServiceRequests ADD Address NVARCHAR(500) NULL
    END
  `)

  await connection.request().query(`
    IF OBJECT_ID(N'dbo.Reviews', N'U') IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM sys.columns
         WHERE object_id = OBJECT_ID(N'dbo.Reviews') AND name = N'UserId' AND is_nullable = 0
       )
    BEGIN
      ALTER TABLE dbo.Reviews ALTER COLUMN UserId INT NULL
    END
  `)
}
