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

    check('titulos')
        .isArray({ min: 1 }).withMessage('Debes añadir al menos una fila de contenido.')
        .custom((value) => {
            if (!value || !value[0] || value[0].trim() === '') {
                throw new Error('El título del primer track es obligatorio');
            }
            return true;
        })
];


const checkAcceso = [
    check('full_name')
        .trim()
        .escape()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 200 }).withMessage('Nombre inválido'),

    check('user_email')
        .trim()
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),

    check('whatsapp_num')
        .trim()
        .escape()
        .notEmpty().withMessage('WhatsApp es obligatorio'),

    check('city')
        .optional({ checkFalsy: true })
        .trim()
        .escape(),

    check('instagram_handle')
        .optional({ checkFalsy: true })
        .trim()
        .escape(),

    check('tiktok_handle')
        .optional({ checkFalsy: true })
        .trim()
        .escape()
];

// Validación para upload multi-artista
const checkUploadMultiArtist = [
    check('generosSeleccionados')
        .notEmpty().withMessage('Debe seleccionar al menos un género.')
        .isLength({ min: 3 }).withMessage('La selección de género no es válida.'),

    check('tracks')
        .isArray({ min: 1, max: 10 }).withMessage('Debe haber entre 1 y 10 tracks.'),

    check('tracks.*.titulo')
        .trim()
        .notEmpty().withMessage('Cada track debe tener un título.')
        .isLength({ max: 200 }).withMessage('El título es demasiado largo.'),

    check('tracks.*.nombreArtista')
        .trim()
        .notEmpty().withMessage('Cada track debe tener un artista.')
        .isLength({ max: 150 }).withMessage('El nombre del artista es demasiado largo.'),

    check('tracks.*.costoCreditos')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('El costo debe ser entre 0 y 100 créditos.')
];

export {
loginValidation,
checkPasswords,
emailValidation,
checkUploadMultimedia,
checkUploadMultiArtist,
checkAcceso
}