#!/bin/bash

# ─────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────
SERVER="u6-pu9mvhpmgwh1@ssh.qrewards.com.mx"
PORT="18765"
SSH_KEY="~/.ssh/id_rsa_siteground"
REMOTE_BASE="/home/customer/www/qrewards.com.mx/public_html"
REMOTE_PATH="$REMOTE_BASE/ta"
BACKUP_PATH="$REMOTE_BASE/backups_ta"
LOCAL_PROJECT_DIR="kre-ta"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "🚀 Iniciando despliegue de /ta (kre-ta)..."

# ─────────────────────────────────────────────
# 1. Compilar proyecto Angular
# ─────────────────────────────────────────────
echo "📦 Compilando proyecto Angular..."
cd $LOCAL_PROJECT_DIR || { echo "❌ Error: No se encontró el directorio $LOCAL_PROJECT_DIR"; exit 1; }
npm run build -- --base-href /ta/
if [ $? -ne 0 ]; then
    echo "❌ Error en la compilación. Abortando despliegue."
    exit 1
fi

DIST_PATH="dist/q-corporativo/browser/"
if [ ! -d "$DIST_PATH" ]; then
    DIST_PATH="dist/q-corporativo/"
fi
cd ..

# ─────────────────────────────────────────────
# 2. Backup remoto con timestamp
# ─────────────────────────────────────────────
echo "🗄️  Creando backup en servidor: backups_ta/ta_$TIMESTAMP..."
ssh -p $PORT -i $SSH_KEY $SERVER "
    mkdir -p $BACKUP_PATH &&
    cp -r $REMOTE_PATH $BACKUP_PATH/ta_$TIMESTAMP &&
    echo 'Backup creado: $BACKUP_PATH/ta_$TIMESTAMP'
"
if [ $? -ne 0 ]; then
    echo "⚠️  No se pudo crear el backup. Continuando de todas formas..."
fi

# ─────────────────────────────────────────────
# 3. Limpiar carpeta remota (deploy limpio)
# ─────────────────────────────────────────────
echo "🧹 Limpiando carpeta remota para deploy limpio..."
ssh -p $PORT -i $SSH_KEY $SERVER "
    rm -rf $REMOTE_PATH &&
    mkdir -p $REMOTE_PATH/backend &&
    echo 'Carpeta limpia y lista.'
"

# ─────────────────────────────────────────────
# 4. Subir frontend
# ─────────────────────────────────────────────
echo "📤 Subiendo frontend..."
rsync -avz -e "ssh -p $PORT -i $SSH_KEY" "$LOCAL_PROJECT_DIR/$DIST_PATH" "$SERVER:$REMOTE_PATH/"

# ─────────────────────────────────────────────
# 5. Subir backend
# ─────────────────────────────────────────────
echo "📤 Subiendo backend..."
rsync -avz -e "ssh -p $PORT -i $SSH_KEY" "$LOCAL_PROJECT_DIR/backend/" "$SERVER:$REMOTE_PATH/backend/"

echo ""
echo "✅ Despliegue completado: https://qrewards.com.mx/ta"
echo "🗄️  Backup guardado en: $BACKUP_PATH/ta_$TIMESTAMP"
