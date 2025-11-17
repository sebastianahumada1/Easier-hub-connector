import * as dotenv from 'dotenv';
import { storage } from './storage';
import { createGHLClient } from './ghlClient';
import { GHLAppointmentsManager } from './ghlAppointments';
import { GHLFunnelsManager } from './ghlFunnels';
import { GHLBigQueryUploader } from './ghlBigQueryUploader';
import { GHLAppointmentMetrics, GHLFunnelMetrics } from './types';

dotenv.config();

/**
 * Script para generar reportes de GoHighLevel y subirlos a BigQuery
 */
async function generateGHLReport() {
  console.log('='.repeat(150));
  console.log('GHL: Generador de Reportes de GoHighLevel');
  console.log('='.repeat(150));
  console.log();

  // Cargar cuentas de GHL
  const ghlAccounts = storage.getAllGHLAccounts();
  
  if (ghlAccounts.length === 0) {
    console.error('GHL: No se encontraron cuentas de GHL configuradas');
    console.log('GHL: Por favor, configura las cuentas en data/ghl-accounts.json');
    process.exit(1);
  }

  console.log(`GHL: ${ghlAccounts.length} cuenta(s) de GHL encontrada(s)`);
  console.log();

  // Calcular rango de fechas (solo día actual, como Facebook)
  const today = new Date();
  
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const dateString = formatDate(today);
  console.log(`GHL: Fecha del reporte: ${dateString}\n`);

  // Arrays para almacenar todas las métricas
  const allAppointmentMetrics: GHLAppointmentMetrics[] = [];
  const allFunnelMetrics: GHLFunnelMetrics[] = [];

  // Procesar cada cuenta de GHL
  for (const account of ghlAccounts) {
    console.log('─'.repeat(150));
    console.log(`GHL: Procesando cuenta "${account.accountName}"...`);
    console.log('─'.repeat(150));
    console.log();

    try {
      // Crear cliente de GHL
      const client = createGHLClient(account.apiKey);
      
      // Crear managers
      const appointmentsManager = new GHLAppointmentsManager(client);
      const funnelsManager = new GHLFunnelsManager(client);

      // Obtener métricas de appointments
      console.log('GHL: Obteniendo métricas de appointments...');
      const appointmentMetrics = await appointmentsManager.getMetrics(
        dateString,
        dateString,
        account.accountId,
        account.accountName
      );
      allAppointmentMetrics.push(appointmentMetrics);
      
      console.log(`GHL: Métricas de appointments obtenidas:`);
      console.log(`   - Total programadas: ${appointmentMetrics.totalScheduled}`);
      console.log(`   - Programadas pagadas: ${appointmentMetrics.scheduledPaid}`);
      console.log(`   - Asistieron: ${appointmentMetrics.showed}`);
      console.log(`   - Cerradas: ${appointmentMetrics.closed}`);
      console.log(`   - Programadas confirmadas: ${appointmentMetrics.scheduledConfirmed}`);
      console.log();

      // Obtener métricas de funnels
      console.log('GHL: Obteniendo métricas de funnels...');
      const funnelMetrics = await funnelsManager.getMetrics(
        dateString,
        dateString,
        account.accountId,
        account.accountName
      );
      allFunnelMetrics.push(...funnelMetrics);
      
      console.log(`GHL: ${funnelMetrics.length} métrica(s) de funnels obtenidas:`);
      funnelMetrics.forEach(funnel => {
        console.log(`   - ${funnel.funnelName}:`);
        console.log(`     * Vistas únicas: ${funnel.uniqueViews}`);
        console.log(`     * Opt-ins: ${funnel.optIns}`);
        console.log(`     * Tasa de opt-in: ${funnel.optInRate.toFixed(2)}%`);
      });
      console.log();

    } catch (error: any) {
      console.error(`GHL: Error procesando cuenta "${account.accountName}":`, error.message);
      console.log();
    }
  }

  // Resumen de datos recolectados
  console.log('═'.repeat(150));
  console.log('GHL: RESUMEN DE DATOS RECOLECTADOS');
  console.log('═'.repeat(150));
  console.log(`Total de métricas de appointments: ${allAppointmentMetrics.length}`);
  console.log(`Total de métricas de funnels: ${allFunnelMetrics.length}`);
  console.log();

  // Subir a BigQuery si está habilitado
  if (process.env.BIGQUERY_ENABLED === 'true') {
    try {
      console.log('GHL: Subiendo datos a BigQuery...');
      console.log();

      const uploader = new GHLBigQueryUploader(
        process.env.BIGQUERY_PROJECT_ID!,
        process.env.BIGQUERY_DATASET_ID!,
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

      // Verificar conexión
      const connected = await uploader.testConnection();
      if (!connected) {
        console.log('⚠ No se pudo conectar a BigQuery\n');
        return;
      }

      // Crear tablas si no existen
      await uploader.createTablesIfNotExist();

      // Subir appointments
      if (allAppointmentMetrics.length > 0) {
        await uploader.uploadAppointments(allAppointmentMetrics);
      }

      // Subir funnels
      if (allFunnelMetrics.length > 0) {
        await uploader.uploadFunnels(allFunnelMetrics);
      }

      console.log();
      console.log('✅ Datos de GHL subidos a BigQuery exitosamente\n');

    } catch (error: any) {
      console.error('❌ Error subiendo a BigQuery:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  } else {
    console.log('⚠ BigQuery está deshabilitado. Los datos no se subieron.\n');
  }

  console.log('='.repeat(150));
  console.log('GHL: Generación de reportes completada');
  console.log('='.repeat(150));
}

// Ejecutar
generateGHLReport().catch((error) => {
  console.error('GHL: Error fatal durante la generación de reportes:', error);
  process.exit(1);
});

