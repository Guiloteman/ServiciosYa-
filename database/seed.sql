USE [ServiciosYa];
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Limpieza')
BEGIN
    INSERT INTO dbo.Categories (Name, Description)
    VALUES ('Limpieza', 'Servicios de limpieza del hogar y oficinas');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Plomería')
BEGIN
    INSERT INTO dbo.Categories (Name, Description)
    VALUES ('Plomería', 'Reparaciones y mantenimiento de instalaciones');
END

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Electricidad')
BEGIN
    INSERT INTO dbo.Categories (Name, Description)
    VALUES ('Electricidad', 'Instalación y mantenimiento eléctrico');
END
GO

PRINT 'Datos iniciales cargados.';
GO
