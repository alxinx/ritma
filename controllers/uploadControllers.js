import { Artistas, Album, Generos, Multimedia, MultimediaGeneros, ArtistaGeneros } from '../models/index.js'
import multimediaQueue from '../queues/multimediaQueue.js';
import db from "../config/bd.js";

const postUploadMultimedia = async (req, res) => {
    const t = await db.transaction();

    try {
        const {
            nombreArtista,
            nombreAlbum,
            generosSeleccionados,
            idArtista,
            idAlbum,
            keyCover,
            keysTracks,
            titulos,
            costos,
            subtitulos,
            metadatos
        } = req.body;

        const generosIds = JSON.parse(generosSeleccionados || "[]");

        // 1. OBTENER O CREAR ARTISTA
        let artista;
        if (idArtista) {
            artista = await Artistas.findByPk(idArtista, { transaction: t });
        } else {
            [artista] = await Artistas.findOrCreate({
                where: { nombreArtista: nombreArtista.trim() },
                transaction: t
            });
        }

        // 2. OBTENER O CREAR ÁLBUM
        let album;
        if (idAlbum) {
            album = await Album.findByPk(idAlbum, { transaction: t });
        } else {
            [album] = await Album.findOrCreate({
                where: { nombreAlbum: nombreAlbum?.trim() || "Single", idArtista: artista.idArtista },
                transaction: t
            });
        }

        // Actualizar portada solo si se subió una nueva
        if (keyCover) {
            await album.update({ cover: keyCover }, { transaction: t });
        }

        // 3. REGISTRO DE TRACKS
        const tracksArray = Array.isArray(keysTracks) ? keysTracks : [keysTracks];
        const resultadosMultimedia = [];

        for (let i = 0; i < tracksArray.length; i++) {
            const keyTemp = tracksArray[i];
            const meta = metadatos[i];

            const nuevoMultimedia = await Multimedia.create({
                nombreComposicion: Array.isArray(titulos) ? titulos[i] : titulos,
                idAlbum: album.idAlbum,
                idArtista: artista.idArtista,
                tipoAsset: keyTemp.endsWith('.mp4') || keyTemp.endsWith('.mov') ? 'VIDEO' : 'AUDIO',
                formato: meta ? meta.formato : 'unknown',
                tamano: meta ? meta.tamano : 0,
                duracion: meta ? meta.duracion : 0,
                costoCreditos: (Array.isArray(costos) ? costos[i] : costos) || 0,
                subtitulos: Array.isArray(subtitulos) && subtitulos[i] === 'on',
                keyTemp: meta.nombreFinal || keyTemp.split('/').pop(),
                estado_ingesta: 'processing'
            }, { transaction: t });

            // Géneros del multimedia
            if (generosIds.length > 0) {
                const multiGeneros = generosIds.map(idGen => ({
                    idMultimedia: nuevoMultimedia.idMultimedia,
                    idGenero: idGen
                }));
                await MultimediaGeneros.bulkCreate(multiGeneros, { transaction: t });
            }

            // Géneros del artista
            if (generosIds.length > 0) {
                const promesasGenerosArtista = generosIds.map(idGen =>
                    ArtistaGeneros.findOrCreate({
                        where: { idArtista: artista.idArtista, idGenero: idGen },
                        transaction: t
                    })
                );
                await Promise.all(promesasGenerosArtista);
            }

            resultadosMultimedia.push({
                ...nuevoMultimedia.toJSON(),
                keyTemp: keyTemp
            });
        }

        await t.commit();

        // 4. ENCOLAR JOBS (ya con la DB confirmada)
        for (const meta of resultadosMultimedia) {
            try {
                await multimediaQueue.add('processPreview', {
                    keyTemp: meta.keyTemp,
                    tipoAsset: meta.tipoAsset
                });
                console.log(`[RTM-QUEUE] Job agregado para: ${meta.keyTemp}`);
            } catch (qError) {
                console.error('[RTM-QUEUE] Error al encolar:', qError);
            }
        }

        res.status(200).json({ ok: true, msg: '¡Registro en Ritma completado! 😌' });

    } catch (error) {
        if (t) await t.rollback();
        console.error('Error Sequelize:', error.name, error.message);
        res.status(500).json({ ok: false, msg: 'Error al guardar en la base de datos: ' + error.message });
    }
};


const validateUpload = async (req, res) => {
    try {
        const { nombreArtista, generosSeleccionados } = req.body;

        if (!nombreArtista || nombreArtista.trim() === "") {
            return res.status(400).json({ ok: false, msg: "El nombre del artista es obligatorio." });
        }

        const generos = JSON.parse(generosSeleccionados || "[]");
        if (generos.length === 0) {
            return res.status(400).json({ ok: false, msg: "Debes seleccionar al menos un género." });
        }

        return res.json({ ok: true, msg: "Metadata validada. Iniciando RTM-ENGINE..." });
    } catch (error) {
        console.error("Error en validación:", error);
        return res.status(500).json({ ok: false, msg: "Error interno al validar datos." });
    }
};


export { postUploadMultimedia, validateUpload }
