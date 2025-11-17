# Configuración de GitHub Actions para Actualización Diaria

## 📋 Pasos para configurar el cronjob automático

### 1. Configurar Secrets en GitHub

Ve a tu repositorio en GitHub:
```
https://github.com/sebastianahumada1/Easier-hub-connector
```

Luego navega a: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea los siguientes 4 secrets:

#### a) `TOKENS_JSON`
Copia el contenido completo de tu archivo `data/tokens.json`:

```json
[
  {
    "appId": "2479333962419437",
    "token": "TU_TOKEN_AQUI",
    ...
  },
  {
    "appId": "752753957408967",
    "token": "TU_TOKEN_AQUI",
    ...
  }
]
```

#### b) `GOOGLE_CREDENTIALS`
Copia el contenido completo del archivo `engaged-lamp-470319-j9-86caeade906f.json`:

```json
{
  "type": "service_account",
  "project_id": "engaged-lamp-470319-j9",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

#### c) `BIGQUERY_PROJECT_ID`
Valor:
```
engaged-lamp-470319-j9
```

#### d) `BIGQUERY_DATASET_ID`
Valor:
```
facebook_ads
```

### 2. Horario del Cronjob

El workflow está configurado para ejecutarse:
- **Automáticamente**: Todos los días a las 2:00 AM UTC (9:00 PM hora Colombia del día anterior)
- **Manualmente**: Desde la pestaña "Actions" en GitHub

#### Cambiar el horario

Edita el archivo `.github/workflows/daily-report.yml` línea 6:

```yaml
- cron: '0 2 * * *'  # Formato: minuto hora * * *
```

Ejemplos de horarios (todos en UTC):
- `'0 14 * * *'` = 2:00 PM UTC = 9:00 AM Colombia
- `'30 14 * * *'` = 2:30 PM UTC = 9:30 AM Colombia
- `'0 3 * * *'` = 3:00 AM UTC = 10:00 PM Colombia (día anterior)

**Recuerda:** Colombia es UTC-5

### 3. Probar el Workflow

1. Ve a la pestaña **Actions** en tu repositorio GitHub
2. Selecciona "Daily Campaign Report Update" en el menú izquierdo
3. Click en **Run workflow** (botón azul a la derecha)
4. Selecciona la rama `main` y click en **Run workflow**
5. Espera a que termine y verifica los logs

### 4. Verificar la Ejecución

Después de ejecutar el workflow:

1. **Ver logs**: Click en el workflow ejecutado para ver detalles
2. **Verificar BigQuery**: 
   ```sql
   SELECT * FROM `engaged-lamp-470319-j9.facebook_ads.campaign_reports_specific`
   ORDER BY uploaded_at DESC
   LIMIT 10;
   ```

### 5. Monitoreo

- GitHub te enviará un email si el workflow falla
- Puedes ver el historial de ejecuciones en la pestaña **Actions**
- El workflow se ejecutará automáticamente todos los días

## 🔧 Estructura del Workflow

El workflow hace lo siguiente:

1. ✅ Descarga el código del repositorio
2. ✅ Instala Node.js 18
3. ✅ Instala las dependencias del proyecto
4. ✅ Crea los archivos de configuración desde los secrets
5. ✅ Ejecuta `npm run specific-accounts` que:
   - Calcula el rango de fechas (solo el día actual)
   - Obtiene datos de Facebook para las 9 cuentas específicas
   - Sube los datos a BigQuery en la tabla `campaign_reports_specific`
6. ✅ Limpia los archivos de credenciales

## 📊 Tabla de BigQuery

Los datos se guardan en:
- **Proyecto**: `engaged-lamp-470319-j9`
- **Dataset**: `facebook_ads`
- **Tabla**: `campaign_reports_specific`

Incluye:
- Métricas generales (spend, leads, impressions, clicks, etc.)
- Datos demográficos (gender, country, region, age)
- `app_id` para identificar la aplicación
- `row_id` para relacionar filas principales con sub-filas demográficas

## ❓ Solución de Problemas

### El workflow falla con "Error: Cannot find module"
- Verifica que `package.json` esté en el repositorio
- Asegúrate de que se ejecute `npm ci` en el workflow

### No se suben datos a BigQuery
- Verifica que `BIGQUERY_ENABLED=true` esté en el .env (ya está en el workflow)
- Revisa los logs del workflow para ver el error específico
- Verifica que las credenciales de Google Cloud sean correctas

### No encuentra las cuentas
- Verifica que `TOKENS_JSON` tenga el formato correcto
- Asegúrate de que los tokens de Facebook no hayan expirado
- Revisa que el `appId` sea correcto

## 🎯 Próximos Pasos

1. Configura los 4 secrets en GitHub
2. Ejecuta el workflow manualmente para probar
3. Verifica que los datos lleguen a BigQuery
4. El workflow se ejecutará automáticamente todos los días

¡Listo! Tu sistema de actualización automática está configurado.

