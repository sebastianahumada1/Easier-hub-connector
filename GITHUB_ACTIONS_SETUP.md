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

#### e) `GHL_ACCOUNTS_JSON`
Copia el contenido completo del archivo `data/ghl-accounts.json`:

```json
[
  {
    "accountId": "west-texas-premier",
    "accountName": "West Texas Premier Center",
    "apiKey": "pit-3718a6ed-6d4c-480a-8e3f-166b12501101"
  },
  {
    "accountId": "another-account",
    "accountName": "Another Account Name",
    "apiKey": "pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
]
```

**Nota:** Puedes agregar múltiples cuentas de GoHighLevel. Cada cuenta necesita su propio API key.

### 2. Horario del Cronjob

El workflow está configurado para ejecutarse:
- **Automáticamente**: Todos los días a las 11:00 PM hora Colombia (4:00 AM UTC)
- **Manualmente**: Desde la pestaña "Actions" en GitHub

#### Cambiar el horario

Edita el archivo `.github/workflows/daily-report.yml` línea 6:

```yaml
- cron: '0 4 * * *'  # Formato: minuto hora * * *
```

Ejemplos de horarios (todos en UTC):
- `'0 4 * * *'` = 4:00 AM UTC = 11:00 PM Colombia (día anterior)
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
6. ✅ Ejecuta `npm run ghl-report` que:
   - Calcula el rango de fechas (solo el día actual)
   - Obtiene datos de GoHighLevel para todas las cuentas configuradas
   - Sube los datos a BigQuery en las tablas `ghl_appointments` y `ghl_funnels`
7. ✅ Limpia los archivos de credenciales

## 📊 Tablas de BigQuery

Los datos se guardan en:
- **Proyecto**: `engaged-lamp-470319-j9`
- **Dataset**: `facebook_ads`

### Tablas de Facebook Ads:
- **`campaign_reports_specific`**: Campañas de Facebook con datos demográficos
  - Métricas generales (spend, leads, impressions, clicks, etc.)
  - Datos demográficos (gender, country, region, age)
  - `app_id` para identificar la aplicación
  - `row_id` para relacionar filas principales con sub-filas demográficas

### Tablas de GoHighLevel (GHL):
- **`ghl_appointments`**: Métricas de citas/appointments
  - `account_id`, `account_name`, `date`
  - `total_scheduled`: Total de citas programadas
  - `scheduled_paid`: Citas pagadas
  - `showed`: Citas donde el cliente asistió
  - `closed`: Citas cerradas/ganadas
  - `scheduled_confirmed`: Citas confirmadas
  
- **`ghl_funnels`**: Métricas de funnels/landing pages
  - `account_id`, `account_name`, `date`
  - `funnel_name`: Nombre del funnel (Qualifying, Survey, Google Ads)
  - `opt_in_rate`: Tasa de conversión (%)
  - `unique_views`: Vistas únicas
  - `opt_ins`: Número de conversiones

### Consultas SQL útiles para GHL:

**Ver métricas de appointments por cuenta:**
```sql
SELECT 
  account_name,
  date,
  total_scheduled,
  scheduled_paid,
  showed,
  closed,
  scheduled_confirmed
FROM `engaged-lamp-470319-j9.facebook_ads.ghl_appointments`
ORDER BY date DESC, account_name
```

**Ver métricas de funnels por tipo:**
```sql
SELECT 
  account_name,
  funnel_name,
  date,
  unique_views,
  opt_ins,
  opt_in_rate
FROM `engaged-lamp-470319-j9.facebook_ads.ghl_funnels`
WHERE funnel_name LIKE '%Qualifying%'
ORDER BY date DESC
```

**Resumen de conversión por funnel (últimos 30 días):**
```sql
SELECT 
  funnel_name,
  SUM(unique_views) as total_views,
  SUM(opt_ins) as total_opt_ins,
  ROUND(AVG(opt_in_rate), 2) as avg_conversion_rate
FROM `engaged-lamp-470319-j9.facebook_ads.ghl_funnels`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY funnel_name
ORDER BY total_opt_ins DESC
```

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

