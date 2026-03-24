
import path from "path"
export default {
    mode : 'development',
    entry : {
        basicValidator : './src/js/basicValidator.js',
        controlPanel : './src/js/controlPanel.js',
        multimediaPanels : './src/js/multimediaPanels.js',
        monitorUpload : './src/js/monitorUpload.js',
        clientPanel : './src/js/clientPanel.js',
        clientMediafile : './src/js/clientMediafile.js',
        clientFavoritos : './src/js/clientFavoritos.js',

    },
    output : {
        filename : '[name].js',
        path : path.resolve('public/js/')

    }
}