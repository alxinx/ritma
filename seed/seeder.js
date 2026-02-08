import { Album } from "../models/index.js";
import album from "./album.js"
//import nombresData from "./departamentosData.js";
//import municipios from "./municipiosData.js";
//import nombresData from "./atributos.js";
//import nombresData from "./categorias.js";
import db from '../config/bd.js'

const importarDatos = async () => {
    try {
        // Autentico
        await db.authenticate();
        console.log('Conexión a DB OK');
        // Sincronizo
        await db.sync(); 
        await Album.bulkCreate(album)

        
        console.log('Datos Importados Correctamente');
        process.exit(0);

    } catch (error) {
        console.log(`El error es : ${error} `);
        process.exit(1);
    }
}

const eliminarDatos = async () => {
    try {   
        // Usamos truncate: true para reiniciar los IDs y limpiar todo rápido
        await Departamentos.destroy({ where: {}, truncate: true });
        console.log('Datos Eliminados');
        process.exit(0);
        
    } catch (error) {
        console.log(`Error al eliminar : ${error}`);
        process.exit(1);
    }
}

if(process.argv[2] === '-i'){
    importarDatos();
}

if(process.argv[2] === '-e'){
    eliminarDatos();
}