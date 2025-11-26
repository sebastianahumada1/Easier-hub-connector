import * as dotenv from 'dotenv';
import { createGHLClient } from './ghlClient';
import { createAppointmentsManager } from './ghlAppointments';
import { createGHLBigQueryUploader } from './ghlBigQueryUploader';
import { GHLAppointment } from './types';

dotenv.config();

/**
 * IDs de appointments obtenidos manualmente desde el Appointment Report
 */
const APPOINTMENT_IDS: string[] = [
  'QLsQiuNaSlsr8ODg11Bv',
  'bxHxWFyVSVZzvU4ZR0u7',
  '0nxxYSFgDyH9MdEWZhcX',
  'VlangUTz9j2RPesyBMGR',
  'dAz2zLN0107YCGJRJZN',
  'hse8NCJ4o7SqfKGBQ9pP',
  'tLnGuMiqE8fD0ZjQDAm',
  '3HJsnWTqT9qV4pjDI4E',
  'NXttyJLhpcMIeBuWeCMWF',
  'x79dUgaJxMAs8564WWF',
  'h3r3SYM6MwfPEIMQgXoJ',
  't0jD8Llpaj193I9mQypm',
  'qHWai6jZsoHzix7rW6P',
  'nilab3ssJBIoBgE4747A',
  'Af41CN0cU1BEY0vmP4Ty5',
  '65w8rIgQJ5KhvbYwJx35',
  'ZBXGCHVhh4avxCbnNUd5',
];

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function generateReportFromIds() {
  console.log('='.repeat(150));
  console.log('GoHighLevel: Reporte de Appointments usando IDs manuales');
  console.log('='.repeat(150));
  console.log();

  const ghlApiKey = process.env.GHL_API_KEY;
  const ghlLocationId = process.env.GHL_LOCATION_ID;
  const bigqueryEnabled = process.env.BIGQUERY_ENABLED === 'true';
  const bigqueryProjectId = process.env.BIGQUERY_PROJECT_ID;
  const bigqueryDatasetId = process.env.BIGQUERY_DATASET_ID;
  const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!ghlApiKey) {
    throw new Error('GHL_API_KEY no está configurado en .env');
  }

  if (!ghlLocationId) {
    throw new Error('GHL_LOCATION_ID no está configurado en .env');
  }

  const client = createGHLClient(ghlApiKey);
  const appointmentsManager = createAppointmentsManager(client);

  const location = await client.getLocation(ghlLocationId);
  const locationName = location?.name || 'Unknown Location';

  const fetchedAppointments: GHLAppointment[] = [];

  console.log(`GHL: Descargando ${APPOINTMENT_IDS.length} appointments por ID...`);

  for (const appointmentId of APPOINTMENT_IDS) {
    const appointment = await client.getAppointmentById(appointmentId);

    if (!appointment) {
      console.warn(`GHL: Appointment ${appointmentId} no se pudo obtener`);
      continue;
    }

    if (appointment.locationId !== ghlLocationId) {
      console.warn(
        `GHL: Appointment ${appointmentId} pertenece a otro location (${appointment.locationId}), se omite`
      );
      continue;
    }

    // Normalizar status para el calculador de métricas
    const normalizedAppointment: GHLAppointment = {
      ...appointment,
      status: appointment.status || appointment.appointmentStatus || '',
    };

    fetchedAppointments.push(normalizedAppointment);
    console.log(`GHL: Appointment ${appointmentId} descargado (${normalizedAppointment.status || 'sin status'})`);
  }

  if (fetchedAppointments.length === 0) {
    console.error('GHL: No se pudo obtener ningún appointment con los IDs proporcionados');
    return;
  }

  // Determinar rango de fechas basado en los appointments descargados
  const timestamps = fetchedAppointments
    .map(app => new Date(app.startTime || app.dateAdded || new Date()).getTime())
    .filter(time => !Number.isNaN(time));

  const minDate = timestamps.length ? new Date(Math.min(...timestamps)) : new Date();
  const maxDate = timestamps.length ? new Date(Math.max(...timestamps)) : new Date();

  const startDate = formatDate(minDate);
  const endDate = formatDate(maxDate);

  console.log();
  console.log(`GHL: Rango cubierto por los appointments: ${startDate} -> ${endDate}`);
  console.log(`GHL: Total de appointments obtenidos: ${fetchedAppointments.length}`);
  console.log();

  // Calcular métricas agregadas reutilizando el manager existente
  const metrics = appointmentsManager.calculateMetrics(
    fetchedAppointments,
    ghlLocationId,
    locationName,
    startDate
  );

  console.log('='.repeat(150));
  console.log('RESUMEN DE MÉTRICAS (IDs manuales)');
  console.log('='.repeat(150));
  console.log(`Location: ${locationName}`);
  console.log(`Período (basado en appointments): ${startDate} -> ${endDate}`);
  console.log();
  console.log(`📊 Total de citas consideradas: ${metrics.totalScheduled}`);
  console.log(`💰 Pagadas: ${metrics.scheduledPaid}`);
  console.log(`✅ Confirmadas: ${metrics.scheduledConfirmed}`);
  console.log(`👥 Showed: ${metrics.showed}`);
  console.log(`🎯 Cerradas: ${metrics.closed}`);
  console.log('='.repeat(150));
  console.log();

  if (bigqueryEnabled && bigqueryProjectId && bigqueryDatasetId) {
    console.log('GHL: Subiendo métricas a BigQuery (IDs manuales)...');

    const uploader = createGHLBigQueryUploader(
      bigqueryProjectId,
      bigqueryDatasetId,
      'ghl_appointments',
      googleCredentials
    );

    await uploader.uploadMetrics(metrics);
    console.log('✅ GHL: Métricas subidas exitosamente a BigQuery');
  } else {
    console.log('ℹ️  GHL: BigQuery no habilitado, sólo se mostraron las métricas en consola');
  }
}

generateReportFromIds().catch(error => {
  console.error('❌ Error ejecutando generate-ghl-report-from-ids:', error.message);
  process.exit(1);
});

