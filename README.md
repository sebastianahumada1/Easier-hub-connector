# Easier Hub Connector - Sistema de Tokens de Facebook

Sistema automático para gestionar tokens de Facebook con renovación automática. Convierte tokens de corta duración a tokens de 60 días y los renueva automáticamente antes de que expiren.

## 🚀 Características

- ✅ Conversión de tokens cortos a tokens de larga duración (60 días)
- ✅ Auto-renovación automática cuando faltan menos de 7 días para expirar
- ✅ Almacenamiento seguro de tokens
- ✅ Soporte para múltiples apps de Facebook
- ✅ Cliente de Facebook para usar los tokens actualizados
- ✅ Logs detallados con timestamps

## 📋 Requisitos

- Node.js 16 o superior
- npm o yarn
- Credenciales de apps de Facebook (App ID, App Secret, Token)

## 🔧 Instalación

1. Instala las dependencias:

```bash
npm install
```

2. Copia el archivo `.env.example` a `.env` y actualiza con tus credenciales:

```bash
cp .env.example .env
```

3. Edita el archivo `.env` con tus credenciales reales:

```env
# Facebook App 1
APP1_ID=tu_app_id
APP1_SECRET=tu_app_secret
APP1_TOKEN=tu_token_actual

# Facebook App 2
APP2_ID=tu_app_id_2
APP2_SECRET=tu_app_secret_2
APP2_TOKEN=tu_token_actual_2
```

## 🎯 Uso

### Paso 1: Inicialización (Primera vez)

Ejecuta el script de inicialización para convertir tus tokens actuales a tokens de larga duración:

```bash
npm run init
```

Este script:
- Convierte tus tokens cortos a tokens de 60 días
- Los guarda en `data/tokens.json`
- Muestra la fecha de expiración de cada token

### Paso 2: Iniciar el Sistema de Auto-Renovación

Una vez inicializado, inicia el sistema que renovará automáticamente los tokens:

```bash
npm start
```

Este script:
- Verifica diariamente (a las 2:00 AM) el estado de los tokens
- Renueva automáticamente tokens que expiren en menos de 7 días
- Mantiene siempre tokens válidos sin intervención manual

## 📦 Usar los Tokens en tu Aplicación

### Cliente Básico de Facebook

```typescript
import { createFacebookClient } from './facebookClient';

const client = createFacebookClient('2479333962419437');

// Obtener información del usuario
const user = await client.get('/me', { fields: 'id,name,email' });

// Obtener páginas
const pages = await client.get('/me/accounts', { fields: 'id,name' });
```

### Obtener Insights de Páginas

```typescript
import { createFacebookClient } from './facebookClient';
import { InsightsManager } from './insights';

const client = createFacebookClient('2479333962419437');
const insightsManager = new InsightsManager(client);

// Obtener páginas
const pagesData = await client.get('/me/accounts', {
  fields: 'id,name,access_token'
});

// Obtener insights de una página
const insights = await insightsManager.getPageInsights(
  pagesData.data[0].id,
  pagesData.data[0].access_token,
  {
    metric: ['page_impressions', 'page_engaged_users', 'page_fans'],
    period: 'day',
  }
);
```

### Obtener Campañas Publicitarias

```typescript
import { createFacebookClient } from './facebookClient';
import { CampaignsManager } from './campaigns';

const client = createFacebookClient('2479333962419437');
const campaignsManager = new CampaignsManager(client);

// Obtener cuentas de anuncios
const adAccounts = await campaignsManager.getAdAccounts();

// Obtener campañas
const campaigns = await campaignsManager.getCampaigns(adAccounts[0].id);

// Obtener insights de una campaña
const insights = await campaignsManager.getCampaignInsights(campaigns[0].id, {
  date_preset: 'last_30d'
});

console.log('Métricas:', insights[0]);
// { impressions, clicks, spend, reach, cpc, cpm, ctr, ... }
```

Ver `src/example-usage.ts` para más ejemplos detallados.

### Generar Reportes de Campañas

Para generar una tabla completa con todas las métricas de tus campañas:

```bash
npm run report
```

Este comando genera:
- ✅ **Tabla en consola** con todas las métricas
- ✅ **Archivo CSV** en la carpeta `reports/` para análisis en Excel

El reporte incluye por cada campaña:
- **Nombre de cuenta** (Member Name) e ID de cuenta
- Gasto total
- Leads generados y costo por lead
- Impresiones, clicks, alcance
- CTR, CPC, CPM
- **Distribución por género** (Masculino, Femenino)
- **Distribución por país**
- **Distribución por región/estado** (con país asociado)
- Fecha de inicio y fin
- Estado de la campaña

Puedes modificar el período del reporte editando `src/generate-report.ts`:

```typescript
const reportParams = {
  date_preset: 'last_30d',  // últimos 30 días
  // O usar fechas personalizadas:
  // time_range: { since: '2025-10-01', until: '2025-10-31' }
};
```

Períodos disponibles: `today`, `yesterday`, `last_7d`, `last_14d`, `last_28d`, `last_30d`, `last_90d`, `this_month`, `last_month`, `lifetime`

#### Ejemplo de Salida:

```
══════════════════════════════════════════════════════════════════════
REPORTE DE CAMPAÑAS PUBLICITARIAS
══════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────
📢 Campaña: Black Friday 2025
──────────────────────────────────────────────────────────────────────

📊 Métricas Generales:
   ID Campaña:        123456789
   Nombre de Cuenta:  Mi Cuenta de Publicidad
   ID de Cuenta:      act_987654321
   Estado:            ACTIVE
   Período:           2025-10-07 → 2025-11-07
   Gasto Total:       $1,234.56
   Leads:             89
   Costo por Lead:    $13.87
   Impresiones:       45,230
   Clicks:            1,567
   Alcance:           32,145
   CTR:               3.46%
   CPC:               $0.79
   CPM:               $27.30

👥 Distribución por Género:
   --------------------------------------------------------------------------------
   Género              Impresiones      Clicks        Gasto
   --------------------------------------------------------------------------------
   Masculino                  24,120       856       $676.44
   Femenino                   21,110       711       $558.12

🌍 Distribución por País (Top 10):
   --------------------------------------------------------------------------------
   País                Impresiones      Clicks        Gasto
   --------------------------------------------------------------------------------
   US                        18,450       623       $492.10
   MX                        12,230       412       $325.80
   CO                         8,120       274       $216.45
   ...

📍 Distribución por Región (Top 10):
   --------------------------------------------------------------------------------------------
   Región                      País         Impresiones      Clicks        Gasto
   --------------------------------------------------------------------------------------------
   California                  US                   8,230       289       $228.45
   Texas                       US                   5,120       178       $140.30
   Ciudad de México            MX                   4,890       165       $130.50
   ...
```

El archivo CSV se guarda en `reports/campaign-report-app1-YYYY-MM-DD.csv`

## 📤 Subir Reportes a BigQuery

### Configuración Inicial

1. **Crear Service Account en Google Cloud:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un proyecto o selecciona uno existente
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva service account
   - Asigna el rol "BigQuery Admin"
   - Genera una clave JSON y guárdala

2. **Configurar variables de entorno en `.env`:**

```env
# BigQuery Configuration
BIGQUERY_ENABLED=true
BIGQUERY_PROJECT_ID=mi-proyecto-gcp
BIGQUERY_DATASET_ID=facebook_ads
BIGQUERY_TABLE_ID=campaign_reports
GOOGLE_APPLICATION_CREDENTIALS=/Users/tu-usuario/gcp-key.json
```

### Opción 1: Subida Automática al Generar Reportes

Una vez configurado, cada vez que ejecutes:

```bash
npm run report
```

El reporte se generará **Y** se subirá automáticamente a BigQuery.

### Opción 2: Subir CSVs Existentes Manualmente

Para subir todos los archivos CSV que ya tienes en la carpeta `reports/`:

```bash
npm run upload-bq
```

Este comando:
- ✅ Verifica la conexión a BigQuery
- ✅ Crea la tabla automáticamente si no existe
- ✅ Sube todos los archivos CSV de la carpeta `reports/`
- ✅ Muestra el progreso de cada archivo

### Esquema de la Tabla en BigQuery

La tabla se crea automáticamente con este esquema:

```
campaign_id (STRING)          - ID de la campaña
campaign_name (STRING)        - Nombre de la campaña
account_name (STRING)         - Nombre de cuenta
account_id (STRING)           - ID de cuenta
status (STRING)               - Estado de la campaña
date_start (DATE)             - Fecha de inicio
date_end (DATE)               - Fecha de fin
spend (FLOAT)                 - Gasto total
leads (INTEGER)               - Leads generados
cost_per_lead (FLOAT)         - Costo por lead
impressions (INTEGER)         - Impresiones
clicks (INTEGER)              - Clicks
reach (INTEGER)               - Alcance
ctr (FLOAT)                   - CTR
cpc (FLOAT)                   - CPC
cpm (FLOAT)                   - CPM
gender (STRING)               - Género
gender_impressions (INTEGER)  - Impresiones por género
gender_clicks (INTEGER)       - Clicks por género
gender_spend (FLOAT)          - Gasto por género
country (STRING)              - País
country_impressions (INTEGER) - Impresiones por país
country_clicks (INTEGER)      - Clicks por país
country_spend (FLOAT)         - Gasto por país
region (STRING)               - Región/Estado
region_country (STRING)       - País de la región
region_impressions (INTEGER)  - Impresiones por región
region_clicks (INTEGER)       - Clicks por región
region_spend (FLOAT)          - Gasto por región
uploaded_at (TIMESTAMP)       - Fecha de carga
```

### Consultas SQL Útiles en BigQuery

**Ver todas las campañas con sus métricas:**
```sql
SELECT 
  campaign_name,
  account_name,
  spend,
  leads,
  cost_per_lead,
  impressions,
  clicks
FROM `tu-proyecto.facebook_ads.campaign_reports`
WHERE gender IS NULL AND country IS NULL AND region IS NULL
ORDER BY spend DESC
```

**Ver distribución por país:**
```sql
SELECT 
  campaign_name,
  country,
  country_impressions,
  country_clicks,
  country_spend
FROM `tu-proyecto.facebook_ads.campaign_reports`
WHERE country IS NOT NULL
ORDER BY country_spend DESC
```

El archivo CSV se guarda en `reports/campaign-report-app1-YYYY-MM-DD.csv`

## 📁 Estructura del Proyecto

```
EasierHubConnector/
├── src/
│   ├── types.ts              # Definiciones de tipos TypeScript
│   ├── tokenManager.ts       # Lógica de conversión y renovación
│   ├── storage.ts            # Gestión de almacenamiento
│   ├── facebookClient.ts     # Cliente de Facebook API
│   ├── insights.ts           # Gestión de insights (métricas)
│   ├── campaigns.ts          # Gestión de campañas publicitarias
│   ├── reports.ts            # Generador de reportes con tablas
│   ├── bigquery-uploader.ts  # Módulo de subida a BigQuery
│   ├── scheduler.ts          # Cron job para auto-renovación
│   ├── init.ts               # Script de inicialización
│   ├── index.ts              # Script principal
│   ├── test.ts               # Script de prueba
│   ├── generate-report.ts    # Script generador de reportes
│   ├── upload-to-bigquery.ts # Script para subir CSVs a BigQuery
│   └── example-usage.ts      # Ejemplos de uso
├── data/
│   └── tokens.json           # Tokens almacenados (auto-generado)
├── reports/                  # Reportes CSV generados (auto-generado)
├── .env                      # Variables de entorno (crear desde .env.example)
├── .env.example              # Template de variables de entorno
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Seguridad

- **Nunca** subas el archivo `.env` a repositorios públicos
- El archivo `data/tokens.json` está en `.gitignore`
- Considera rotar tus tokens y secretos periódicamente
- Los tokens que compartiste deberían ser regenerados después de este setup

## 🛠️ Scripts Disponibles

- `npm run build` - Compila el proyecto TypeScript
- `npm run init` - Script de inicialización (primera vez)
- `npm start` - Inicia el sistema de auto-renovación
- `npm run test` - Ejecuta pruebas y muestra datos de campañas
- `npm run report` - **Genera reporte completo de campañas en tabla y CSV** (sube a BigQuery si está habilitado)
- `npm run upload-bq` - **Sube todos los CSVs existentes a BigQuery**
- `npm run dev` - Ejecuta en modo desarrollo con ts-node

## 📊 Logs

Todos los logs tienen el prefijo `FacebookTokenManager:` para fácil identificación:

```
FacebookTokenManager: Iniciando verificación de tokens...
FacebookTokenManager: App 2479333962419437 - Token expira en 45 días
FacebookTokenManager: Token de app 2479333962419437 no necesita renovación todavía
FacebookTokenManager: Verificación completada
```

## ⚠️ Solución de Problemas

### Error: "No se pudo intercambiar el token"
- Verifica que el App ID y App Secret sean correctos
- Asegúrate de que el token inicial sea válido
- Revisa que el token tenga los permisos necesarios

### Error: "No se encontró token almacenado"
- Ejecuta primero `npm run init` para inicializar los tokens
- Verifica que el archivo `data/tokens.json` existe y tiene contenido

### Los tokens no se renuevan
- Asegúrate de que el proceso está ejecutándose (`npm start`)
- Revisa los logs para ver si hay errores
- Verifica que el cron job está configurado correctamente

## 📝 Notas

- Los tokens de Facebook de larga duración tienen una validez de 60 días
- El sistema renueva automáticamente cuando faltan menos de 7 días
- Puedes ajustar el horario del cron job en `src/scheduler.ts` (línea con `cron.schedule`)
- Para producción, considera usar PM2 o similar para mantener el proceso ejecutándose

## 📱 Integración con GoHighLevel (GHL)

El sistema recolecta métricas de citas (appointments) de GoHighLevel y las sube a BigQuery.

### Datos de GHL recolectados:

**Métricas de Appointments (Citas):**
- **Total de citas programadas**: Combinación de no confirmadas, confirmadas y pagadas
- **Citas programadas pagadas**: Número de citas con status "paid"
- **Citas confirmadas**: Número de citas con status "confirmed"
- **Citas donde asistieron (showed)**: Número de citas donde el cliente se presentó
- **Citas cerradas**: Número de citas completadas/cerradas

### Configuración:

1. **Obtén tu API key de GoHighLevel:**
   - Ve a tu cuenta de GoHighLevel
   - Settings → API Keys
   - Crea un nuevo API key (tipo `pit-`)

2. **Obtén tu Location ID:**
   - Ve a tu cuenta de GoHighLevel
   - El Location ID está en la URL cuando estás dentro de tu subcuenta
   - Ejemplo: `https://app.gohighlevel.com/v2/location/ESTE_ES_TU_LOCATION_ID/dashboard`

3. **Configura las variables de entorno en `.env`:**

```env
# GoHighLevel Configuration
GHL_API_KEY=pit-tu-token-aqui
GHL_LOCATION_ID=tu-location-id-aqui
```

4. **Ejecuta el reporte de GHL:**

```bash
npm run ghl-report
```

Este comando:
- Usa el Location ID configurado en `.env`
- Recolecta todas las citas de los últimos 30 días
- Calcula las métricas agregadas
- Sube los datos a BigQuery en la tabla `ghl_appointments`

### Cargar citas usando IDs manuales

Si desde el Appointment Report exportas los IDs de las citas, puedes usarlos para generar un resumen rápido:

1. Actualiza el arreglo `APPOINTMENT_IDS` en `src/generate-ghl-report-from-ids.ts` con los IDs exportados.
2. Ejecuta:
   ```bash
   npm run ghl-report-from-ids
   ```
3. El script descargará cada cita por su ID, calculará métricas básicas (confirmadas, pagadas, etc.) y las subirá a BigQuery en la misma tabla `ghl_appointments`.

### Listar eventos para depuración

Si necesitas validar si hay eventos en un rango específico antes de subirlos, ejecuta:

```bash
npm run ghl-list-events
```

Este comando lista en consola todos los eventos encontrados entre `2025-11-01` y `2025-11-26`, agrupados por calendario. Si no se encuentran eventos, mostrará una advertencia.

### Consultas SQL útiles en BigQuery:

**Ver métricas de appointments:**
```sql
SELECT 
  date,
  location_name,
  total_scheduled,
  scheduled_paid,
  showed,
  closed,
  scheduled_confirmed
FROM `tu-proyecto.facebook_ads.ghl_appointments`
ORDER BY date DESC
```

**Resumen de los últimos 30 días:**
```sql
SELECT 
  location_name,
  SUM(total_scheduled) as total_programadas,
  SUM(scheduled_paid) as total_pagadas,
  SUM(showed) as total_asistieron,
  SUM(closed) as total_cerradas,
  ROUND(AVG(showed * 100.0 / NULLIF(total_scheduled, 0)), 2) as tasa_asistencia
FROM `tu-proyecto.facebook_ads.ghl_appointments`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY location_name
```

## 🤖 Automatización con GitHub Actions

### Configurar Actualización Diaria Automática

El proyecto incluye un workflow de GitHub Actions que ejecuta automáticamente la actualización de BigQuery todos los días.

**📚 Ver guía completa:** [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

#### Resumen rápido:

1. **Configurar 6 secrets en GitHub:**
   - `TOKENS_JSON` - Contenido de `data/tokens.json`
   - `GOOGLE_CREDENTIALS` - Contenido de tu archivo de credenciales de GCP
   - `BIGQUERY_PROJECT_ID` - ID del proyecto de BigQuery
   - `BIGQUERY_DATASET_ID` - ID del dataset de BigQuery
   - `GHL_API_KEY` - Tu API key de GoHighLevel
   - `GHL_LOCATION_ID` - Tu Location ID de GoHighLevel

2. **El workflow se ejecutará:**
   - Automáticamente todos los días a las 11:00 PM hora Colombia (4:00 AM UTC)
   - Manualmente desde la pestaña Actions en GitHub

3. **Qué hace:**
   - Obtiene datos de Facebook del día actual
   - Procesa las 9 cuentas específicas configuradas
   - Sube todo a BigQuery en la tabla `campaign_reports_specific`
   - Obtiene datos de GoHighLevel de los últimos 30 días
   - Sube métricas de appointments a BigQuery en la tabla `ghl_appointments`

**Ver:** `.github/workflows/daily-report.yml` para más detalles

## 🤝 Soporte

Si encuentras problemas, verifica:
1. Las credenciales en `.env` son correctas
2. Los tokens iniciales son válidos
3. Tienes conexión a internet
4. Los logs para mensajes de error específicos

