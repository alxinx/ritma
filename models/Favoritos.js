import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const Favoritos = db.define('FAVORITOS', {
    idFavorito: {
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
    idMultimedia: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'MULTIMEDIA',
            key: 'idMultimedia'
        }
    }
}, {
    timestamps: true,
    tableName: 'FAVORITOS',
    indexes: [
        {
            unique: true,
            fields: ['idUsuario', 'idMultimedia'],
            name: 'uq_usuario_multimedia_favorito'
        }
    ]
});

export default Favoritos;
