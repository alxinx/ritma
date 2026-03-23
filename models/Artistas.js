import { DataTypes, UUIDV4 } from "sequelize";
import db from "../config/bd.js"

const Artistas =  db.define('ARTISTAS', {
    idArtista : {
        type : DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey : true,
    },
    nombreArtista : {
        type : DataTypes.STRING(150),
        allowNull : false,
    },
    cover :{
        type : DataTypes.STRING,
        allowNull : true 
    },
    descargas : {
        type : DataTypes.INTEGER,
        defaultValue : 0
    }
},
{
    timestamps : true,
    tableName : 'ARTISTAS',
    indexes : [
        { unique : false, fields : ['nombreArtista']}
    ]
    
}

)


export default Artistas;