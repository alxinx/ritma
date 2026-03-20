import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const Wishlist = db.define('WISHLIST', {
    idWishlist: {
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
    },
    fechaCreacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    estado: {
        type: DataTypes.ENUM('en lista', 'comprada'),
        defaultValue: 'en lista',
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'WISHLIST'
});

export default Wishlist;
