import Usuarios from './Usuarios.js';
import Generos from './Generos.js';
import Artistas from './Artistas.js'
import Album from './Album.js'
import Multimedia from './Multimedia.js'
import ArtistaGeneros from './ArtistaGeneros.js';
import MultimediaGeneros from './MultimediaGeneros.js'



//relacionens.
Artistas.hasMany(Album, { 
    foreignKey: 'idArtista',
    onDelete: 'CASCADE' 
});
Album.belongsTo(Artistas, { 
    foreignKey: 'idArtista' 
});



Album.hasMany(Multimedia, { foreignKey: 'idAlbum' });
Multimedia.belongsTo(Album, { foreignKey: 'idAlbum' });

// --- 2. RELACIONES N:M (Muchos a Muchos) ---

// El core: Para que la canción tenga sus etiquetas (los pills que mencionas)
Multimedia.belongsToMany(Generos, { through: 'MULTIMEDIA_GENEROS', foreignKey: 'idMultimedia' });
Generos.belongsToMany(Multimedia, { through: 'MULTIMEDIA_GENEROS', foreignKey: 'idGenero' });

// El buscador: Para que al buscar "Reggaetón" aparezcan los artistas
Artistas.belongsToMany(Generos, { through: 'ARTISTA_GENEROS', foreignKey: 'idArtista' });
Generos.belongsToMany(Artistas, { through: 'ARTISTA_GENEROS', foreignKey: 'idGenero' });



export {
        Usuarios, Generos ,Artistas, Album, Multimedia, ArtistaGeneros, MultimediaGeneros

}