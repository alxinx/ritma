import { validationResult } from 'express-validator';

const validarErrores = (req, res, next) => {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        return res.status(400).json({
            ok: false,
            errores: errores.array().map(err => ({
                msg: err.msg
            }))
        });
    }

    // Si todo está bien, continúa al controlador
    next();
};

export default validarErrores;