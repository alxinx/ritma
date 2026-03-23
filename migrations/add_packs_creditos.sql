-- ============================================
-- MIGRACIÓN: Módulo de Créditos
-- 1. Crear tabla PACKS_CREDITOS
-- 2. Agregar FK idPack a RITMA_COINS
-- 3. Renombrar valorDescarga → valorPack
-- ============================================

-- 1. Crear tabla PACKS_CREDITOS (VARCHAR(36) para compatibilidad con Sequelize UUID)
CREATE TABLE IF NOT EXISTS PACKS_CREDITOS (
    idPack VARCHAR(36) NOT NULL,
    nombrePack VARCHAR(255) NOT NULL UNIQUE,
    valorPack DOUBLE NOT NULL DEFAULT 0,
    nroCreditos INT NOT NULL DEFAULT 0,
    descuento INT NOT NULL DEFAULT 0,
    estado ENUM('enable', 'disable') NOT NULL DEFAULT 'enable',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (idPack)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Renombrar columna valorDescarga → valorPack en RITMA_COINS
ALTER TABLE RITMA_COINS
    CHANGE COLUMN valorDescarga valorPack DOUBLE NOT NULL DEFAULT 0;

-- 3. Agregar columna idPack a RITMA_COINS (mismo tipo VARCHAR(36))
ALTER TABLE RITMA_COINS
    ADD COLUMN idPack VARCHAR(36) NULL AFTER idUsuario;

-- 4. Agregar FK con RESTRICT/CASCADE
ALTER TABLE RITMA_COINS
    ADD CONSTRAINT fk_ritmacoins_pack
    FOREIGN KEY (idPack) REFERENCES PACKS_CREDITOS(idPack)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
