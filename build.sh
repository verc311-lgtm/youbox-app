#!/bin/bash
# Script para actualizar, compilar y reiniciar el proyecto en el servidor

echo "========== ACTUALIZANDO CÓDIGO =========="
git pull

echo "========== INSTALANDO DEPENDENCIAS =========="
npm install

echo "========== COMPILANDO PROYECTO (BUILD) =========="
npm run build

echo "========== REINICIANDO SERVICIO =========="
if command -v pm2 &> /dev/null
then
    echo "Reiniciando procesos con PM2..."
    pm2 restart all
else
    echo "PM2 no está instalado. Si usas 'node server.js' directamente, por favor detén el proceso anterior y vuelve a iniciarlo."
fi

echo "========== PROCESO COMPLETADO =========="
