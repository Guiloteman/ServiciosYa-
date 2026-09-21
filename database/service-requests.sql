USE [ServiciosYa];
GO

IF OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ServiceRequests (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServiceId INT NOT NULL,
        ClientName NVARCHAR(200) NULL,
        ClientPhone NVARCHAR(50) NULL,
        ClientEmail NVARCHAR(200) NULL,
        Address NVARCHAR(500) NULL,
        Message NVARCHAR(1000) NULL,
        Latitude DECIMAL(10,8) NULL,
        Longitude DECIMAL(11,8) NULL,
        PaymentMethod NVARCHAR(20) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ServiceRequests_Status DEFAULT 'pending'
            CHECK (Status IN ('pending', 'accepted', 'rejected', 'completed')),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ServiceRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_ServiceRequests_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(Id)
    );
END
GO

CREATE INDEX IX_ServiceRequests_Service ON dbo.ServiceRequests(ServiceId);
CREATE INDEX IX_ServiceRequests_Status ON dbo.ServiceRequests(Status);
GO

PRINT 'Tabla ServiceRequests creada correctamente.';
GO
