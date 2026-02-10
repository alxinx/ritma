import { check } from "express-validator";

//Logueo  usuarios 
const loginValidation = [
    check('emailUsuario')
        .trim()
        .isEmail().withMessage('Debe ser un email válido'),

    check('password')
        .trim()
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener mínimo 8 caracteres')
]


const emailValidation = [
    check('email')
    .trim()
    .isLength({min:4})
    .isEmail()
    .withMessage('Debe darme un email válido.')
]

const checkPasswords = [
    check('password')
        // Quitamos .trim() por seguridad
        .isLength({ min: 5 })
        .withMessage('La contraseña debe tener al menos 5 caracteres'),

    check('password_again')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                // Lanzamos el error que capturará nuestro sistema de alertas
                throw new Error('Las claves no coinciden.');
            }
            return true;
        })
];

//Verifico que los datos multimedia minumos esten llenos. 
const checkUploadMultimedia = [
    // Usamos .trim() para limpiar espacios accidentales
    check('nombreArtista')
        .trim()
        .notEmpty().withMessage('El nombre del artista es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es demasiado largo'),

    check('generosSeleccionados')
        .notEmpty().withMessage('Debe seleccionar al menos un género.')
        .isLength({ min: 5 }).withMessage('La selección de género no es válida.'),

    check('titulo')
        .isArray({ min: 1 }).withMessage('Debes añadir al menos una fila de contenido.')
        .custom((value) => {
            if (!value || !value[0] || value[0].trim() === '') {
                throw new Error('El título del primer track es obligatorio');
            }
            return true;
        })
];


export {
loginValidation,
checkPasswords,
emailValidation,
checkUploadMultimedia
}