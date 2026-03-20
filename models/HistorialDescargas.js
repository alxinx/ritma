import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const HistorialDescargas = db.define('HISTORIAL_DESCARGAS_MULTIMEDIA', {
    idDescarga: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    idMultimedia: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'MULTIMEDIA',
            key: 'idMultimedia'
        },
        field: 'idMultimedia'
    },
    idUsuario: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'USUARIOS',
            key: 'idUsuario'
        },
        field: 'idUsuario'
    },
    fechaDescarga: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    creditos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    }
}, {
    timestamps: false,
    tableName: 'HISTORIAL_DESCARGAS_MULTIMEDIA'
});

export default HistorialDescargas;
