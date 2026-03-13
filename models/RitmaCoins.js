import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const RitmaCoins = db.define('RITMA_COINS', {
    idRitma: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'USUARIOS',
            key: 'idUsuario'
        }
    },
    cantidadComprada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    cantidadActual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    valorDescarga: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    fechaCompra: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    fechaUltimaCompra: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'RITMA_COINS'
});

export default RitmaCoins;
