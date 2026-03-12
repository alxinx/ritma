import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const ArtistaGeneros = db.define('ARTISTA_GENEROS', {
    idArtistaGeneros: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
},
    idArtista: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'ARTISTAS',
            key: 'idArtista'
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
    tableName: 'ARTISTA_GENEROS'
});

export default ArtistaGeneros;