# ─────────────────────────────────────────────────────────────
# Imagen base: Node 20 LTS sobre Debian Slim
# ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# 1. Dependencias de sistema:
#    - ffmpeg       → procesamiento de audio/video (multimediaWorker)
#    - python3/make/g++/build-essential → compilación de módulos nativos (bcrypt, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Directorio de trabajo
WORKDIR /usr/src/app

# 3. Copiar solo manifiestos primero (aprovecha caché de Docker)
#    Si package.json no cambia, npm ci no se re-ejecuta en builds posteriores.
COPY package*.json ./

# 4. Instalar dependencias (ci es más rápido y determinista que install)
#    Incluye devDependencies porque webpack y tailwind se necesitan en build/dev
RUN npm ci

# 5. Copiar el resto del proyecto (el .dockerignore excluye node_modules, .env, etc.)
COPY . .

# 6. Crear directorios de runtime que el app necesita
#    (se crean en el build para que existan incluso sin volumen montado)
RUN mkdir -p upload temp_processing

# 7. Puerto que expone Express (debe coincidir con APP_PORT en .env)
EXPOSE 2028

# 8. Arranque con nodemon para hot-reload en desarrollo.
#    Para producción, reemplazar por: CMD ["node", "index.js"]
CMD ["npm", "run", "start"]
