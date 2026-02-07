
import path from "path"
export default {
    mode : 'development',
    entry : {
        basicValidator : './src/js/basicValidator.js',
        controlPanel : './src/js/controlPanel.js',

    },
    output : {
        filename : '[name].js',
        path : path.resolve('public/js/')

    }
}