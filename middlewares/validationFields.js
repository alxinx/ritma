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


export {
loginValidation,
checkPasswords,
emailValidation
}