import { DataTypes } from "sequelize";
import db from "../config/bd.js";

const Multimedia = db.define('MULTIMEDIA', {
    idMultimedia: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nombreComposicion: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    // Nota: idArtista e idAlbum se omiten aquí porque index.js creará las FK
    
    keyR2: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Integridad total en el bucket
    },
    formato: {
        type: DataTypes.STRING(10), 
        allowNull: false
    },
    tamano: {
        type: DataTypes.BIGINT, 
        allowNull: false
    },
    tipoAsset: {
        type: DataTypes.ENUM('AUDIO', 'VIDEO', 'TOOL'),
        allowNull: false
    },
    bpm: {
        type: DataTypes.SMALLINT, 
        allowNull: true
    },
    duracion: {
        type: DataTypes.INTEGER, 
        allowNull: true
    },
    costoCreditos: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    descargas: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Evitamos el null
    },
    estado: {
        type: DataTypes.ENUM('ENABLE', 'DISABLE'),
        defaultValue: 'ENABLE'
    },
    estado_ingesta : {
        type: DataTypes.ENUM('uploading', 'processing', 'ready', 'error'),
        allowNull : true 
    },
    idArtista: {
        type: DataTypes.UUID,
        allowNull: true, // Cámbialo a false después si quieres obligatoriedad
        references: {
            model: 'ARTISTAS',
            key: 'idArtista'
        },
        field: 'idArtista' // <--- ESTO es lo que obliga a Sequelize a usar ese nombre exacto
    },
    idAlbum: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'ALBUM',
            key: 'idAlbum'
        },
        field: 'idAlbum'
    }
}, {
    timestamps: true,
    tableName: 'MULTIMEDIA',
    indexes: [
        { unique: false, fields: ['nombreComposicion'] }
    ]
});

export default Multimedia;