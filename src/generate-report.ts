import * as dotenv from 'dotenv';
import { createFacebookClient } from './facebookClient';
import { storage } from './storage';
import { ReportsManager } from './reports';
import { BigQueryUploader } from './bigquery-uploader';

dotenv.config();

/**
 * Script para generar reportes de campañas con todas las métricas
 */
async function generateReport() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Generador de Reportes de Campañas');
  console.log('='.repeat(150));
  console.log();

  const allTokens = storage.getAllTokens();

  if (allTokens.length === 0) {
    console.error('FacebookTokenManager: No se encontraron tokens almacenados');
    console.error('FacebookTokenManager: Ejecuta "npm run init" primero');
    process.exit(1);
  }

  // Puedes modificar estos parámetros según necesites
  const reportParams = {
    // Opciones de período:
    // 'today', 'yesterday', 'this_month', 'last_month', 
    // 'this_quarter', 'last_3d', 'last_7d', 'last_14d', 
    // 'last_28d', 'last_30d', 'last_90d', 'lifetime'
    // date_preset: 'last_30d',
    
    // Rango de fechas personalizado (Noviembre 7-13, 2025):
    time_range: {
      since: '2025-11-07',
      until: '2025-11-13'
    }
  };

  console.log(`FacebookTokenManager: Generando reporte para período: ${reportParams.time_range.since} - ${reportParams.time_range.until}\n`);

  // Filtrar solo la app específica
  const targetAppId = '752753957408967';
  const filteredTokens = allTokens.filter(token => token.appId === targetAppId);
  
  if (filteredTokens.length === 0) {
    console.error(`FacebookTokenManager: No se encontró la app con ID ${targetAppId}`);
    process.exit(1);
  }

  // Procesar solo la app filtrada
  for (let i = 0; i < filteredTokens.length; i++) {
    const tokenData = filteredTokens[i];
    const appNum = i + 1;

    console.log('─'.repeat(150));
    console.log(`FacebookTokenManager: Procesando App ${appNum} (ID: ${tokenData.appId})`);
    console.log('─'.repeat(150));
    console.log();

    try {
      const client = createFacebookClient(tokenData.appId);
      const reportsManager = new ReportsManager(client);

      // Generar reporte
      const reports = await reportsManager.getCampaignsReport(reportParams);

      if (reports.length === 0) {
        console.log('⚠ No se encontraron campañas con datos en este período\n');
        continue;
      }

      // Mostrar reporte en consola
      reportsManager.printReport(reports);

      // Exportar a CSV
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `campaign-report-app${appNum}-${timestamp}.csv`;
      const filePath = reportsManager.exportToCSV(reports, filename);

      console.log(`\n✅ Reporte generado exitosamente`);
      console.log(`📁 Archivo CSV: ${filePath}\n`);

      // Subir a BigQuery si está habilitado
      if (process.env.BIGQUERY_ENABLED === 'true') {
        try {
          console.log('FacebookTokenManager: Subiendo a BigQuery...');
          
          const uploader = new BigQueryUploader(
            process.env.BIGQUERY_PROJECT_ID!,
            process.env.BIGQUERY_DATASET_ID!,
            process.env.BIGQUERY_TABLE_ID!,
            process.env.GOOGLE_APPLICATION_CREDENTIALS
          );

          // Verificar conexión y crear tabla si no existe
          const connected = await uploader.testConnection();
          if (connected) {
            await uploader.createTableIfNotExists();
            
            // Agregar app_id a cada reporte antes de subirlo
            const reportsWithAppId = reports.map(report => ({
              ...report,
              appId: tokenData.appId
            }));
            
            // Opción 1: Subir desde objetos (más eficiente y rápido)
            await uploader.uploadFromReports(reportsWithAppId);
            
            // Opción 2: Subir CSV (descomenta si prefieres esta opción)
            // await uploader.uploadCSV(filePath);
            
            console.log('✅ Datos subidos a BigQuery exitosamente\n');
          } else {
            console.log('⚠ No se pudo conectar a BigQuery, reporte solo guardado localmente\n');
          }
        } catch (error: any) {
          console.error('❌ Error subiendo a BigQuery:', error.message);
          console.error('El reporte CSV fue guardado correctamente pero no se subió a BigQuery\n');
        }
      }

    } catch (error: any) {
      console.error(`\n❌ Error generando reporte para app ${tokenData.appId}:`, error.message);
      if (error.response?.data) {
        console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Generación de reportes completada');
  console.log('='.repeat(150));
}

// Ejecutar
generateReport().catch((error) => {
  console.error('FacebookTokenManager: Error fatal durante la generación de reportes:', error);
  process.exit(1);
});

