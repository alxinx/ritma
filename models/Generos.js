import { DataTypes, UUIDV4 } from "sequelize";
import db from "../config/bd.js"
const Genero = db.define('GENEROS', {
    genero_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(50),
        allowNull: false
    }
},{
    tableName : "GENEROS"
});

// En tu archivo de asociaciones
//Genero.hasMany(Multimedia, { foreignKey: 'genero_id' });
//Multimedia.belongsTo(Genero, { foreignKey: 'genero_id' });

export default Genero;