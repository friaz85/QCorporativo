#!/bin/bash

# ─────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────
SERVER="u6-pu9mvhpmgwh1@ssh.qrewards.com.mx"
PORT="18765"
SSH_KEY="~/.ssh/id_rsa_siteground"
REMOTE_BASE="/home/customer/www/qrewards.com.mx/public_html"
REMOTE_PATH="$REMOTE_BASE/corporativo"
BACKUP_PATH="/home/customer/www/qrewards.com.mx/backups_corporativo"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "🚀 Iniciando despliegue de /corporativo..."

# ─────────────────────────────────────────────
# 1. Compilar proyecto Angular
# ─────────────────────────────────────────────
echo "📦 Generando archivo de versión..."
echo "export const BUILD_VERSION = '$(date '+%Y.%m.%d-%H%M')';" > src/app/version.ts

echo "📦 Compilando proyecto Angular..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error en la compilación. Abortando despliegue."
    exit 1
fi

DIST_PATH="dist/q-corporativo/browser/"
if [ ! -d "$DIST_PATH" ]; then
    DIST_PATH="dist/q-corporativo/"
fi

# ─────────────────────────────────────────────
# 2. Backup remoto con timestamp (Adicional al manual)
# ─────────────────────────────────────────────
echo "🗄️ Creando backup en servidor: backups_corporativo/corporativo_$TIMESTAMP..."
ssh -p $PORT -i $SSH_KEY $SERVER "
    mkdir -p $BACKUP_PATH &&
    cp -r $REMOTE_PATH $BACKUP_PATH/corporativo_$TIMESTAMP &&
    echo 'Backup creado: $BACKUP_PATH/corporativo_$TIMESTAMP'
"
if [ $? -ne 0 ]; then
    echo "⚠️ No se pudo crear el backup. Continuando de todas formas..."
fi

# ─────────────────────────────────────────────
# 3. Limpiar carpeta remota (deploy limpio - preservando qpn y pdfs)
# ─────────────────────────────────────────────
echo "🧹 Limpiando carpeta remota (preservando backend/qpn y backend/pdfs)..."
ssh -p $PORT -i $SSH_KEY $SERVER "
    mkdir -p $REMOTE_PATH/backend/qpn &&
    mkdir -p $REMOTE_PATH/backend/pdfs &&
    mkdir -p $REMOTE_PATH/backend/library &&
    find $REMOTE_PATH -mindepth 1 ! -path '$REMOTE_PATH/backend*' -delete 2>/dev/null || true
    find $REMOTE_PATH/backend -mindepth 1 ! -path '$REMOTE_PATH/backend/qpn*' ! -path '$REMOTE_PATH/backend/pdfs*' ! -path '$REMOTE_PATH/backend/library*' -delete 2>/dev/null || true
    echo 'Carpeta limpia y lista.'
"

# ─────────────────────────────────────────────
# 4. Subir frontend
# ─────────────────────────────────────────────
echo "📤 Subiendo frontend..."
rsync -avz --chmod=D755,F644 -e "ssh -p $PORT -i $SSH_KEY" "$DIST_PATH" "$SERVER:$REMOTE_PATH/"

# ─────────────────────────────────────────────
# 5. Subir backend
# ─────────────────────────────────────────────
echo "📤 Subiendo backend..."
rsync -avz --chmod=D755,F644 -e "ssh -p $PORT -i $SSH_KEY" "backend/" "$SERVER:$REMOTE_PATH/backend/"

# ─────────────────────────────────────────────
# 6. Subir archivos adicionales y asegurar permisos
# ─────────────────────────────────────────────
echo "📤 Subiendo archivos de la raíz php..."
scp -P $PORT -i $SSH_KEY check_telefonia.php describe_ce.php schema.php kre-ta-temp-check.php "$SERVER:$REMOTE_PATH/"
ssh -p $PORT -i $SSH_KEY $SERVER "chmod 755 $REMOTE_PATH $REMOTE_PATH/backend"

echo ""
echo "✅ Despliegue completado: https://qrewards.com.mx/corporativo/"
echo "🗄️ Backup guardado en: $BACKUP_PATH/corporativo_$TIMESTAMP"
