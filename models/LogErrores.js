import { DataTypes } from 'sequelize';
import db from '../config/bd.js';

const LogErrores = db.define('log_errores', {
    idLog: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    modulo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Ej: PREVIEW_ENGINE, ADMIN_CONTROLLER, R2_UPLOAD'
    },
    nivel: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'HIGH'
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Mensaje descriptivo del error'
    },
    stack: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Rastro completo del error (archivo y línea exacta)'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos adicionales: IDs, nombres de archivos, payload del body'
    },
    estado_resolucion: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Marca si el error ya fue revisado y solucionado'
    }
}, {
    timestamps: true, // Genera automáticamente createdAt y updatedAt [cite: 2026-01-22]
    tableName: 'log_errores'
});

export default LogErrores;