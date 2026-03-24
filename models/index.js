import Usuarios from './Usuarios.js';
import Generos from './Generos.js';
import Artistas from './Artistas.js'
import Album from './Album.js'
import Multimedia from './Multimedia.js'
import ArtistaGeneros from './ArtistaGeneros.js';
import MultimediaGeneros from './MultimediaGeneros.js'
import LogErrores from './LogErrores.js'
import HistorialDescargas from './HistorialDescargas.js'
import Aspirantes from './Aspirantes.js'
import RitmaCoins from './RitmaCoins.js'
import PacksCreditos from './PacksCreditos.js'
import Wishlist from './Wishlist.js'
import Favoritos from './Favoritos.js'



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

Artistas.hasMany(Multimedia, { foreignKey: 'idArtista' });
Multimedia.belongsTo(Artistas, { foreignKey: 'idArtista' });

// --- 2. RELACIONES N:M (Muchos a Muchos) ---

// El core: Para que la canción tenga sus etiquetas (los pills que mencionas)
Multimedia.belongsToMany(Generos, { through: 'MULTIMEDIA_GENEROS', foreignKey: 'idMultimedia' });
Generos.belongsToMany(Multimedia, { through: 'MULTIMEDIA_GENEROS', foreignKey: 'idGenero' });

// El buscador: Para que al buscar "Reggaetón" aparezcan los artistas
Artistas.belongsToMany(Generos, { through: 'ARTISTA_GENEROS', foreignKey: 'idArtista' });
Generos.belongsToMany(Artistas, { through: 'ARTISTA_GENEROS', foreignKey: 'idGenero' });

// --- 3. HISTORIAL DE DESCARGAS ---
Multimedia.hasMany(HistorialDescargas, { foreignKey: 'idMultimedia' });
HistorialDescargas.belongsTo(Multimedia, { foreignKey: 'idMultimedia' });
Usuarios.hasMany(HistorialDescargas, { foreignKey: 'idUsuario' });
HistorialDescargas.belongsTo(Usuarios, { foreignKey: 'idUsuario' });

// --- 4. RITMA COINS ---
Usuarios.hasMany(RitmaCoins, { foreignKey: 'idUsuario' });
RitmaCoins.belongsTo(Usuarios, { foreignKey: 'idUsuario' });

// --- 4b. PACKS CREDITOS → RITMA COINS ---
PacksCreditos.hasMany(RitmaCoins, { foreignKey: 'idPack', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
RitmaCoins.belongsTo(PacksCreditos, { foreignKey: 'idPack', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// --- 5. WISHLIST ---
Usuarios.hasMany(Wishlist, { foreignKey: 'idUsuario' });
Wishlist.belongsTo(Usuarios, { foreignKey: 'idUsuario' });
Multimedia.hasMany(Wishlist, { foreignKey: 'idMultimedia' });
Wishlist.belongsTo(Multimedia, { foreignKey: 'idMultimedia' });


// --- 6. FAVORITOS ---
Usuarios.hasMany(Favoritos, { foreignKey: 'idUsuario', onDelete: 'CASCADE' });
Favoritos.belongsTo(Usuarios, { foreignKey: 'idUsuario' });
Multimedia.hasMany(Favoritos, { foreignKey: 'idMultimedia', onDelete: 'CASCADE' });
Favoritos.belongsTo(Multimedia, { foreignKey: 'idMultimedia' });

export {
        Usuarios, Generos, Artistas, Album, Multimedia, ArtistaGeneros, MultimediaGeneros, LogErrores, HistorialDescargas, Aspirantes, RitmaCoins, PacksCreditos, Wishlist, Favoritos
}