import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const PacksCreditos = db.define('PACKS_CREDITOS', {
    idPack: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombrePack: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    valorPack: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: { min: 0 }
    },
    nroCreditos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 10000 }
    },
    descuento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 99 }
    },
    estado: {
        type: DataTypes.ENUM('enable', 'disable'),
        defaultValue: 'enable',
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'PACKS_CREDITOS'
});

export default PacksCreditos;
