USE master;
GO

IF DB_ID(N'ServiciosYa') IS NULL
BEGIN
    CREATE DATABASE [ServiciosYa];
END
GO

USE [ServiciosYa];
GO

-- =========================
-- 1) Usuarios
-- =========================
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Email NVARCHAR(200) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(128) NOT NULL,
        PasswordSalt NVARCHAR(64) NOT NULL,
        Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'client'
            CHECK (Role IN ('client', 'provider', 'admin')),
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

-- =========================
-- 2) Categorías
-- =========================
IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

-- =========================
-- 3) Servicios
-- =========================
IF OBJECT_ID(N'dbo.Services', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Services (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProviderId INT NOT NULL,
        CategoryId INT NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NOT NULL,
        Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
        Location NVARCHAR(200) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Services_Status DEFAULT 'active'
            CHECK (Status IN ('active', 'paused', 'cancelled', 'completed')),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_Services_Provider FOREIGN KEY (ProviderId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_Services_Category FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(Id)
    );
END
GO

-- =========================
-- 4) Reservas / bookings
-- =========================
IF OBJECT_ID(N'dbo.Bookings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Bookings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ClientId INT NOT NULL,
        ProviderId INT NOT NULL,
        ServiceId INT NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Bookings_Status DEFAULT 'pending'
            CHECK (Status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_Bookings_Client FOREIGN KEY (ClientId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_Bookings_Provider FOREIGN KEY (ProviderId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_Bookings_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id)
    );
END
GO

-- =========================
-- 5) Reseñas
-- =========================
IF OBJECT_ID(N'dbo.Reviews', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reviews (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServiceId INT NOT NULL,
        UserId INT NULL,
        Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
        Comment NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_Reviews_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id),
        CONSTRAINT FK_Reviews_User FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
    );
END
GO

-- =========================
-- 6) Índices
-- =========================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email' AND object_id = OBJECT_ID('dbo.Users'))
BEGIN
    CREATE INDEX IX_Users_Email ON dbo.Users(Email);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Services_Provider' AND object_id = OBJECT_ID('dbo.Services'))
BEGIN
    CREATE INDEX IX_Services_Provider ON dbo.Services(ProviderId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Services_Category' AND object_id = OBJECT_ID('dbo.Services'))
BEGIN
    CREATE INDEX IX_Services_Category ON dbo.Services(CategoryId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bookings_Client' AND object_id = OBJECT_ID('dbo.Bookings'))
BEGIN
    CREATE INDEX IX_Bookings_Client ON dbo.Bookings(ClientId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bookings_Provider' AND object_id = OBJECT_ID('dbo.Bookings'))
BEGIN
    CREATE INDEX IX_Bookings_Provider ON dbo.Bookings(ProviderId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Reviews_Service' AND object_id = OBJECT_ID('dbo.Reviews'))
BEGIN
    CREATE INDEX IX_Reviews_Service ON dbo.Reviews(ServiceId);
END
GO

PRINT 'Base de datos ServiciosYa creada correctamente.';
GO
