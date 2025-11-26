import * as dotenv from 'dotenv';
import { createGHLClient } from './ghlClient';
import { createAppointmentsManager } from './ghlAppointments';
import { createGHLBigQueryUploader } from './ghlBigQueryUploader';

dotenv.config();

/**
 * Script para generar reportes de citas de GoHighLevel
 * y subirlos a BigQuery
 */
async function generateGHLReport() {
  console.log('='.repeat(150));
  console.log('GoHighLevel: Generador de Reportes de Appointments');
  console.log('='.repeat(150));
  console.log();

  try {
    // Leer credenciales de .env
    const ghlApiKey = process.env.GHL_API_KEY;
    const bigqueryEnabled = process.env.BIGQUERY_ENABLED === 'true';
    const bigqueryProjectId = process.env.BIGQUERY_PROJECT_ID;
    const bigqueryDatasetId = process.env.BIGQUERY_DATASET_ID;
    const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!ghlApiKey) {
      throw new Error('GHL_API_KEY no está configurado en .env');
    }

    console.log('GHL: Configuración cargada');
    console.log(`  - BigQuery habilitado: ${bigqueryEnabled}`);
    console.log();

    // Crear cliente GHL
    const client = createGHLClient(ghlApiKey);
    
    // Obtener Location ID automáticamente
    console.log('GHL: Obteniendo Location ID automáticamente...');
    const locationId = await client.getFirstLocationId();
    
    if (!locationId) {
      throw new Error('No se pudo obtener el Location ID automáticamente');
    }

    // Obtener información del location
    const locations = await client.getLocations();
    const location = locations.find(loc => loc.id === locationId);
    const locationName = location?.name || 'Unknown Location';

    console.log(`GHL: Location seleccionado: ${locationName} (${locationId})`);
    console.log();

    // Calcular rango de fechas: últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDate = formatDate(thirtyDaysAgo);
    const endDate = formatDate(today);

    console.log(`GHL: Rango de fechas: ${startDate} a ${endDate} (últimos 30 días)`);
    console.log();

    // Crear manager de appointments
    const appointmentsManager = createAppointmentsManager(client);

    // Obtener métricas
    console.log('GHL: Obteniendo y calculando métricas...');
    const metrics = await appointmentsManager.getMetrics(
      locationId,
      locationName,
      startDate,
      endDate
    );

    console.log();
    console.log('='.repeat(150));
    console.log('RESUMEN DE MÉTRICAS');
    console.log('='.repeat(150));
    console.log(`Location: ${metrics.locationName}`);
    console.log(`Período: ${startDate} a ${endDate}`);
    console.log();
    console.log(`📊 Total de citas programadas: ${metrics.totalScheduled}`);
    console.log(`   (combinación de no confirmadas, confirmadas y pagadas)`);
    console.log();
    console.log(`💰 Citas programadas pagadas: ${metrics.scheduledPaid}`);
    console.log(`✅ Citas confirmadas: ${metrics.scheduledConfirmed}`);
    console.log(`👥 Citas donde asistieron (showed): ${metrics.showed}`);
    console.log(`🎯 Citas cerradas: ${metrics.closed}`);
    console.log('='.repeat(150));
    console.log();

    // Subir a BigQuery si está habilitado
    if (bigqueryEnabled && bigqueryProjectId && bigqueryDatasetId) {
      console.log('GHL: Subiendo métricas a BigQuery...');
      
      const uploader = createGHLBigQueryUploader(
        bigqueryProjectId,
        bigqueryDatasetId,
        'ghl_appointments',
        googleCredentials
      );

      // Verificar conexión
      const connected = await uploader.testConnection();
      if (!connected) {
        throw new Error('No se pudo conectar a BigQuery');
      }

      // Subir métricas
      await uploader.uploadMetrics(metrics);
      
      console.log();
      console.log('✅ GHL: Métricas subidas exitosamente a BigQuery');
      console.log(`   Tabla: ${bigqueryProjectId}.${bigqueryDatasetId}.ghl_appointments`);
    } else {
      console.log('ℹ️  GHL: BigQuery no está habilitado, métricas no subidas');
    }

    console.log();
    console.log('='.repeat(150));
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(150));

  } catch (error: any) {
    console.error();
    console.error('='.repeat(150));
    console.error('❌ ERROR EN EL PROCESO');
    console.error('='.repeat(150));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
generateGHLReport();

