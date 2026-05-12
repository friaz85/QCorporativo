# Guía de Despliegue para /ta (kre-ta)

Este proyecto Angular se despliega de forma independiente en la ruta `/ta` del servidor SiteGround.

## Instrucciones de Uso

Para desplegar la versión más reciente de la campaña kre-ta:

1. Abre una terminal en la raíz de `QCorporativo`.
2. Ejecuta el script:
   ```bash
   ./deploy_ta.sh
   ```

## Lo que hace el script
- Entra a la carpeta `kre-ta/`.
- Ejecuta `npm run build -- --base-href /ta/` (vital para que los assets carguen en la subruta).
- Sincroniza mediante `rsync` los archivos de `dist/q-corporativo/browser/` hacia `/home/customer/www/qrewards.com.mx/public_html/ta/`.

## Seguridad
- **Aislamiento**: El script solo toca la carpeta `/ta` en el servidor. No afecta la raíz ni la carpeta `/corporativo`.
- **Limpieza**: Usa el flag `--delete` de rsync para que el servidor sea un espejo exacto de la compilación local (borra archivos viejos en el servidor que ya no existan localmente).
