import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const Aspirantes = db.define('ASPIRANTES', {
    idAspirante: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombreAspirante: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellidoAspirante: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    emailAspirante: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true
    },
    whatsappAspirante: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true
    },
    ciudadAspirante: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    instagramAspirante: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tiktokAspirante: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    estadoAspirante: {
        type: DataTypes.ENUM('aspirante', 'rechazado', 'aceptado'),
        defaultValue: 'aspirante',
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'ASPIRANTES'
});

export default Aspirantes;
