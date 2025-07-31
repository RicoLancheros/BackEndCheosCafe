-- =====================================================
-- SCRIPT DE INICIALIZACIÓN PARA CHEOS CAFÉ DATABASE
-- =====================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS cheos_cafe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario para la aplicación
CREATE USER IF NOT EXISTS 'cheos_cafe_app'@'localhost' IDENTIFIED BY 'CheosCafe2024!';
CREATE USER IF NOT EXISTS 'cheos_cafe_app'@'%' IDENTIFIED BY 'CheosCafe2024!';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON cheos_cafe_db.* TO 'cheos_cafe_app'@'localhost';
GRANT ALL PRIVILEGES ON cheos_cafe_db.* TO 'cheos_cafe_app'@'%';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Usar la base de datos
USE cheos_cafe_db;

-- =====================================================
-- DATOS DE PRUEBA INICIALES
-- =====================================================

-- Nota: Los modelos y tablas se crearán automáticamente con Prisma
-- Este script solo configura la base de datos y usuario

-- Una vez que ejecutes `npx prisma db push` o `npx prisma migrate dev`,
-- puedes ejecutar el siguiente script para datos de prueba:

/*
-- Insertar categorías de prueba
INSERT INTO Category (id, name, description, isActive, sortOrder, createdAt, updatedAt) VALUES
('clvx1a2b3c4d5e6f7g8h9i0j', 'Café Premium', 'Cafés de origen único y mezclas especiales', TRUE, 1, NOW(), NOW()),
('clvx2b3c4d5e6f7g8h9i0j1k', 'Café Tradicional', 'Cafés clásicos colombianos', TRUE, 2, NOW(), NOW()),
('clvx3c4d5e6f7g8h9i0j1k2l', 'Café Orgánico', 'Cafés certificados orgánicos', TRUE, 3, NOW(), NOW()),
('clvx4d5e6f7g8h9i0j1k2l3m', 'Café Descafeinado', 'Cafés sin cafeína', TRUE, 4, NOW(), NOW()),
('clvx5e6f7g8h9i0j1k2l3m4n', 'Accesorios', 'Productos complementarios para café', TRUE, 5, NOW(), NOW());

-- Insertar usuario admin de prueba
INSERT INTO User (id, name, email, password, phone, role, isActive, avatar, createdAt, updatedAt) VALUES
('clvx6f7g8h9i0j1k2l3m4n5o', 'Administrador', 'admin@cheoscafe.com', '$2b$12$LQv3c1yqBwEUWxJGONPr/eKmj4CZUhz5z5z5z5z5z5z5z5z5z5z5z', '+573001234567', 'admin', TRUE, NULL, NOW(), NOW());

-- Insertar preferencias para el admin
INSERT INTO UserPreferences (id, userId, notifications, newsletter, language, paymentMethod, createdAt, updatedAt) VALUES
('clvx7g8h9i0j1k2l3m4n5o6p', 'clvx6f7g8h9i0j1k2l3m4n5o', TRUE, TRUE, 'es', 'online', NOW(), NOW());

-- Insertar productos de ejemplo
INSERT INTO Product (id, name, description, price, originalPrice, weight, categoryId, images, inStock, stockQuantity, roastLevel, origin, flavorNotes, isRecommended, discount, sku, createdAt, updatedAt) VALUES
('clvx8h9i0j1k2l3m4n5o6p7q', 'Café Huila Premium', 'Café especial del departamento del Huila, con notas achocolatadas y cítricas', 35000, 40000, '500g', 'clvx1a2b3c4d5e6f7g8h9i0j', '[]', TRUE, 50, 'medio', 'Huila, Colombia', '["chocolate", "cítrico", "caramelo"]', TRUE, 12, 'HUILA-PREM-500', NOW(), NOW()),
('clvx9i0j1k2l3m4n5o6p7q8r', 'Café Nariño Especial', 'Café de altura de Nariño con cuerpo balanceado', 32000, NULL, '500g', 'clvx1a2b3c4d5e6f7g8h9i0j', '[]', TRUE, 30, 'claro', 'Nariño, Colombia', '["floral", "frutal", "dulce"]', TRUE, NULL, 'NARINO-ESP-500', NOW(), NOW()),
('clvxa0j1k2l3m4n5o6p7q8r9s', 'Café Tradicional Colombiano', 'Mezcla tradicional de cafés colombianos', 25000, NULL, '500g', 'clvx2b3c4d5e6f7g8h9i0j1k', '[]', TRUE, 100, 'medio', 'Colombia', '["tradicional", "equilibrado", "suave"]', FALSE, NULL, 'TRAD-COL-500', NOW(), NOW());
*/

-- =====================================================
-- INFORMACIÓN DE CONFIGURACIÓN
-- =====================================================
/*
  Para usar este script:
  
  1. Asegúrate de tener MySQL 8.0 o superior
  2. Ejecuta: mysql -u root -p < init.sql
  3. Actualiza el archivo .env con:
    DATABASE_URL="mysql://cheos_cafe_app:CheosCafe2024!@localhost:3306/cheos_cafe_db"
 
 Notas importantes:
 - La base de datos usa utf8mb4 para soporte completo de emojis
 - Los timestamps usan CURRENT_TIMESTAMP para actualizaciones automáticas
 - Los IDs usan CUID para mejor distribución
 - Se incluyen índices para optimizar consultas frecuentes
 - El usuario admin de prueba tendrá contraseña: Admin123! (debes cambiarla después del primer login)
 - Los datos de prueba se insertan después de ejecutar las migraciones de Prisma
*/