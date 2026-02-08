import Usuarios from './Usuarios.js';
import Genero from './Generos.js';
import Artistas from './Artistas.js'
import Album from './Album.js'



//relacionens.
Artistas.hasMany(Album, { 
    foreignKey: 'idArtista',
    onDelete: 'CASCADE' 
});
Album.belongsTo(Artistas, { 
    foreignKey: 'idArtista' 
});



export {
        Usuarios, Genero,Artistas, Album

}