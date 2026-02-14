import { Multimedia, ArtistaGeneros, MultimediaGeneros, Artistas, Album, Generos } from "../models/index.js";
import album from './album.js'
import db from '../config/bd.js'

// Importar datos de ejemplo o archivos JSON si los tienes
// import artistasData from './data/artistas.json' assert { type: 'json' };

const importarDatos = async () => {
    try {
        await db.authenticate();
        await db.sync({ force: false }); 

        console.log('Iniciando importación...');

        // 1. Las tablas maestras SI pueden ir en paralelo porque no dependen de nadie
        // Supongamos que tienes arrays de datos listos para estas tablas
        /* await Promise.all([
            Artistas.bulkCreate(artistasData),
            Generos.bulkCreate(generosData)
        ]); 
        */

        // 2. Multimedia debe crearse antes que sus relaciones
        // Nota: bulkCreate necesita un array de objetos como parámetro
        const canciones = await Multimedia.bulkCreate([
            // { nombreComposicion: 'Track 1', ... },
        ]);

        // 3. Ahora que existen las canciones, las tablas puente SI pueden ir en paralelo
        // Esto acelera el proceso significativamente
        await Promise.all([
            Album.bulkCreate(album),
            //MultimediaGeneros.bulkCreate(album)
        ]);

        console.log('Datos Importados Correctamente');
        process.exit(0);

    } catch (error) {
        console.error(`Error al importar: ${error}`);
        process.exit(1);
    }
}

const eliminarDatos = async () => {
    try {   
        // El orden aquí es inverso: primero borras las tablas con dependencias (FK)
        // O usas truncate con cascade si tu DB lo soporta
        await Promise.all([
            MultimediaGeneros.destroy({ where: {}, truncate: true }),
            ArtistaGeneros.destroy({ where: {}, truncate: true }),
            Multimedia.destroy({ where: {}, truncate: true }),
            Album.destroy({ where: {}, truncate: true }),
            Artistas.destroy({ where: {}, truncate: true })
        ]);

        console.log('Datos Eliminados');
        process.exit(0);
        
    } catch (error) {
        console.error(`Error al eliminar: ${error}`);
        process.exit(1);
    }
}

if(process.argv[2] === '-i') importarDatos();
if(process.argv[2] === '-e') eliminarDatos();