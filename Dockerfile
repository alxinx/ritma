# Usamos una imagen base de Node.js robusta (Debian Slim)
FROM node:20-bookworm-slim

# 1. Instalamos FFmpeg (para audio) y dependencias de compilación (para bcrypt/sharp)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Directorio de trabajo
WORKDIR /usr/src/app

# 3. Copiamos los archivos de configuración de dependencias
COPY package*.json ./

# 4. Instalamos todas las librerías de tu package.json
# Usamos 'npm install' para que respete tus versiones actuales
RUN npm install

# 5. Copiamos el resto de tu proyecto (el 50% ya avanzado)
COPY . .

# 6. Exponemos el puerto de tu API Express
EXPOSE 2028
CMD ["npm", "run", "start"]