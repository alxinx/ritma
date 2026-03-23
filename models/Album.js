import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const Album = db.define('ALBUM', {
    idAlbum: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    nombreAlbum: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    // Este campo actuará como Foreign Key
    idArtista: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'ARTISTAS',
            key: 'idArtista'
        }
    },
    cover: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cover' // Esto asegura que apunte a la columna de tu imagen
    }
}, {
    timestamps: true,
    tableName: 'ALBUM',
    indexes: [
        { unique: false, fields: ['nombreAlbum'] }
    ]
});



export default Album;