import sharp from 'sharp';
import fs from 'fs';
import  path  from 'path';

const procesarImagenes =  async (req, res, next)=>{

    if (!req.files || !req.files['coverAlbum']) return next();

    const portada = req.files['coverAlbum'][0];
    const nuevoNombre = `${path.parse(portada.filename).name}.webp`;
    const outputPath = path.join(portada.destination, nuevoNombre);

    try {
        await sharp(portada.path)
            .resize(1000, 1000, { // Tamaño de todas las imagenes va a ser de 1000
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 80 }) 
            .toFile(outputPath);

        if (fs.existsSync(portada.path)) {
            fs.unlinkSync(portada.path);
        }

        // Actualizamos el objeto en req.files para que el controlador vea el .webp
        portada.path = outputPath;
        portada.filename = nuevoNombre;
        portada.mimetype = 'image/webp';
        console.log(`[RTM-OPTIMIZER] Portada procesada con éxito: ${nuevoNombre}`);
        next();
    } catch (error) {
        console.error('Error procesando imagen con Sharp:', error);
        next();
    }

}


export default procesarImagenes