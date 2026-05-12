#!/bin/bash

# Configuración
SERVER="u6-pu9mvhpmgwh1@ssh.qrewards.com.mx"
PORT="18765"
REMOTE_PATH="/home/customer/www/qrewards.com.mx/public_html/ta/"
LOCAL_PROJECT_DIR="kre-ta"

echo "🚀 Iniciando despliegue de /ta (kre-ta)..."

# 1. Entrar al directorio del proyecto
cd $LOCAL_PROJECT_DIR || { echo "❌ Error: No se encontró el directorio $LOCAL_PROJECT_DIR"; exit 1; }

# 2. Instalar dependencias si es necesario (opcional, descomentar si se requiere)
# npm install

# 3. Compilar el proyecto con base-href /ta/
echo "📦 Compilando proyecto Angular..."
npm run build -- --base-href /ta/

# 4. Verificar directorio de salida
# Angular 17+ suele compilar en dist/[nombre-proyecto]/browser
DIST_PATH="dist/q-corporativo/browser/"

if [ ! -d "$DIST_PATH" ]; then
    # Reintento con ruta alternativa si cambia por configuración
    DIST_PATH="dist/q-corporativo/"
fi

echo "📤 Sincronizando archivos al servidor ($REMOTE_PATH)..."

# 5. Desplegar usando rsync
rsync -avz -e "ssh -p $PORT" --delete "$DIST_PATH" "$SERVER:$REMOTE_PATH"

echo "✅ Despliegue completado con éxito en https://qrewards.com.mx/ta"
