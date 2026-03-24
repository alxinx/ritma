-- =============================================
-- MIGRACIÓN: Tabla FAVORITOS
-- =============================================

CREATE TABLE IF NOT EXISTS FAVORITOS (
    idFavorito    INT           NOT NULL AUTO_INCREMENT,
    idUsuario     VARCHAR(36)   NOT NULL,
    idMultimedia  VARCHAR(36)   NOT NULL,
    createdAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (idFavorito),

    CONSTRAINT fk_favoritos_usuario
        FOREIGN KEY (idUsuario) REFERENCES USUARIOS(idUsuario)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_favoritos_multimedia
        FOREIGN KEY (idMultimedia) REFERENCES MULTIMEDIA(idMultimedia)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT uq_usuario_multimedia_favorito
        UNIQUE (idUsuario, idMultimedia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
