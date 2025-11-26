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
  'OnxxYSFgDyH9MdEWZhcX',
  'VIangUTz9j2RPesyBMGR',
  'dA2r2zLN0107YCGRJXZN',
  'hse8NJC4o7SqfKGBQ9pP',
  'tLnGuMiqE8fDD0jZQDAm',
  '3HJsnWTqT9qV4p3iDl4E',
  'NXttyjLhocPlbEuWcMWT',
  'x79dIUqaXzMAs8564WFW',
  'hir3SYm6MwfPEIMQgXoJ',
  't0jDBLdpa193I9mQypfm',
  'qHWai6ijZS0Hzix7rW6P',
  'nilab3ssJBloBgE4747A',
  'Af41CNCu1BEY0VmP4Ty5',
  '65w8IrgQJ5KhvbYwJx3s',
  'ZBXGCHVhh4avxCbnNud5',
];

const MANUAL_START_DATE = '2025-11-01';
const MANUAL_END_DATE = '2025-11-26';

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

  const calendars = await client.getCalendars(ghlLocationId);
  const calendarNameById = new Map(calendars.map(calendar => [calendar.id, calendar.name]));

  const fetchedAppointments: GHLAppointment[] = [];
  const appointmentsWithinRange: GHLAppointment[] = [];
  const appointmentsOutsideRange: Array<{ appointment: GHLAppointment; start: Date | null }> = [];

  const rangeStart = new Date(`${MANUAL_START_DATE}T00:00:00Z`);
  const rangeEnd = new Date(`${MANUAL_END_DATE}T23:59:59Z`);

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

    const appointmentStart = normalizedAppointment.startTime
      ? new Date(normalizedAppointment.startTime)
      : normalizedAppointment.dateAdded
      ? new Date(normalizedAppointment.dateAdded)
      : null;

    const isWithinRange =
      appointmentStart !== null &&
      !Number.isNaN(appointmentStart.getTime()) &&
      appointmentStart >= rangeStart &&
      appointmentStart <= rangeEnd;

    if (isWithinRange) {
      appointmentsWithinRange.push(normalizedAppointment);
    } else {
      appointmentsOutsideRange.push({ appointment: normalizedAppointment, start: appointmentStart });
    }

    console.log(`GHL: Appointment ${appointmentId} descargado (${normalizedAppointment.status || 'sin status'})`);
  }

  if (fetchedAppointments.length === 0) {
    console.error('GHL: No se pudo obtener ningún appointment con los IDs proporcionados');
    return;
  }

  console.log('\n=== Appointments encontrados dentro del rango 2025-11-01 -> 2025-11-26 ===');
  if (appointmentsWithinRange.length === 0) {
    console.log('⚠️  Ningún appointment coincide con el rango solicitado.');
  } else {
    appointmentsWithinRange.forEach(app => {
      const calendarName = calendarNameById.get(app.calendarId || '') || app.calendarId || 'calendar-desconocido';
      const start = app.startTime || app.dateAdded || 'sin fecha';
      const status = app.status || app.appointmentStatus || 'sin status';
      console.log(`• ${app.id} | ${start} | ${status} | ${calendarName}`);
    });
  }

  if (appointmentsOutsideRange.length) {
    console.log('\n=== Appointments fuera del rango especificado ===');
    appointmentsOutsideRange.forEach(({ appointment, start }) => {
      const calendarName = calendarNameById.get(appointment.calendarId || '') || appointment.calendarId || 'calendar-desconocido';
      const formattedDate = start ? formatDate(start) : 'sin fecha';
      console.log(`• ${appointment.id} | ${formattedDate} | ${appointment.status || appointment.appointmentStatus || 'sin status'} | ${calendarName}`);
    });
  }

  if (appointmentsWithinRange.length === 0) {
    console.warn('\nNo se subirá nada a BigQuery porque no hubo appointments dentro del rango solicitado.');
    return;
  }

  // Determinar rango de fechas basado en los appointments dentro del rango
  const timestamps = appointmentsWithinRange
    .map(app => new Date(app.startTime || app.dateAdded || new Date()).getTime())
    .filter(time => !Number.isNaN(time));

  const minDate = timestamps.length ? new Date(Math.min(...timestamps)) : rangeStart;
  const maxDate = timestamps.length ? new Date(Math.max(...timestamps)) : rangeEnd;

  const startDate = formatDate(minDate);
  const endDate = formatDate(maxDate);

  console.log();
  console.log(`GHL: Rango usado para métricas: ${startDate} -> ${endDate}`);
  console.log(`GHL: Total de appointments dentro del rango: ${appointmentsWithinRange.length}`);
  console.log();

  // Calcular métricas agregadas reutilizando el manager existente
  const metrics = appointmentsManager.calculateMetrics(
    appointmentsWithinRange,
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

    try {
      await uploader.uploadMetrics(metrics);
      console.log('✅ GHL: Métricas subidas exitosamente a BigQuery');
    } catch (error: any) {
      console.error('❌ GHL: Error subiendo métricas a BigQuery:', error.message);
      if (error.errors) {
        console.error('Detalles:', JSON.stringify(error.errors, null, 2));
      }
    }
  } else {
    console.log('ℹ️  GHL: BigQuery no habilitado, sólo se mostraron las métricas en consola');
  }
}

generateReportFromIds().catch(error => {
  console.error('❌ Error ejecutando generate-ghl-report-from-ids:', error.message);
  process.exit(1);
});

