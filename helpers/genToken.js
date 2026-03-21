import jwt from "jsonwebtoken";
import crypto from "crypto";

// Access token — corta vida (15 min)
const generarJwt = (payload) => {
  return jwt.sign(
    { id: payload },
    process.env.APP_PRIVATEKEY,
    { expiresIn: '15m' }
  );
};

// Refresh token — opaco, se guarda en Redis
const generarRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const generarId = () => Math.random().toString(32).substring(2) + Date.now().toString(32);

export {
    generarId, generarJwt, generarRefreshToken
}
