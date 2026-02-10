import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const MultimediaGeneros = db.define('MULTIMEDIA_GENEROS', {
    idMultimediaGeneros: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idMultimedia: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'MULTIMEDIA',
            key: 'idMultimedia'
        }
    },
    idGenero: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'GENEROS',
            key: 'idGenero'
        }
    }
}, {
    timestamps: false,
    tableName: 'MULTIMEDIA_GENEROS'
});

export default MultimediaGeneros;