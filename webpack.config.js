
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

    },
    output : {
        filename : '[name].js',
        path : path.resolve('public/js/')

    }
}