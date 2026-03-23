
import path from "path"
export default {
    mode : 'development',
    entry : {
        basicValidator : './src/js/basicValidator.js',
        controlPanel : './src/js/controlPanel.js',
        multimediaPanels : './src/js/multimediaPanels.js',
        monitorUpload : './src/js/monitorUpload.js',
        listadoMultimedia : './src/js/listadoMultimedia.js',
        mediafileProfile : './src/js/mediafileProfile.js',
        userProfile : './src/js/userProfile.js',
        multiArtistUpload : './src/js/multiArtistUpload.js',
        clientPanel : './src/js/clientPanel.js',
        clientMediafile : './src/js/clientMediafile.js',
        clientBiblioteca : './src/js/clientBiblioteca.js',
        clientWishlist : './src/js/clientWishlist.js',
        clientSettings : './src/js/clientSettings.js',
        adminCreditos : './src/js/adminCreditos.js',
        clientFavoritos : './src/js/clientFavoritos.js'

    },
    output : {
        filename : '[name].js',
        path : path.resolve('public/js/')

    }
}