import * as dotenv from 'dotenv';
import { createGHLClient } from './ghlClient';
import { GHLAppointment } from './types';

dotenv.config();

const START_DATE = '2025-11-01';
const END_DATE = '2025-11-26';

const formatEvent = (event: GHLAppointment): string => {
  const start = event.startTime || event.dateAdded || 'sin-fecha';
  const status = event.status || event.appointmentStatus || 'sin-status';
  const title = event.title || event.appointmentMeta?.defaultFormDetails?.firstName || 'sin-título';
  return `• ${event.id} | ${start} | ${status} | ${title}`;
};

async function listGHLEvents(): Promise<void> {
  const ghlApiKey = process.env.GHL_API_KEY;
  const ghlLocationId = process.env.GHL_LOCATION_ID;

  if (!ghlApiKey) {
    throw new Error('GHL_API_KEY no está configurado en .env');
  }

  if (!ghlLocationId) {
    throw new Error('GHL_LOCATION_ID no está configurado en .env');
  }

  const client = createGHLClient(ghlApiKey);
  const calendars = await client.getCalendars(ghlLocationId);

  if (calendars.length === 0) {
    console.log('GHL: No se encontraron calendarios para este location.');
    return;
  }

  const startTime = `${START_DATE}T00:00:00Z`;
  const endTime = `${END_DATE}T23:59:59Z`;
  let totalEvents = 0;

  console.log('='.repeat(120));
  console.log(`Listando eventos de GoHighLevel del ${START_DATE} al ${END_DATE}`);
  console.log('='.repeat(120));

  for (const calendar of calendars) {
    const events: GHLAppointment[] = await client.listCalendarEvents(
      calendar.id,
      ghlLocationId,
      startTime,
      endTime
    );

    if (!events.length) {
      continue;
    }

    totalEvents += events.length;
    console.log(`\nCalendario: ${calendar.name} (${calendar.id})`);
    console.log(`Eventos encontrados: ${events.length}`);
    events.forEach(event => console.log(formatEvent(event)));
  }

  if (totalEvents === 0) {
    console.log('⚠️  No se encontraron eventos en el rango solicitado.');
  } else {
    console.log('\n'.repeat(1));
    console.log('='.repeat(120));
    console.log(`Total de eventos listados: ${totalEvents}`);
    console.log('='.repeat(120));
  }
}

listGHLEvents().catch(error => {
  console.error('❌ Error listando eventos de GHL:', error.message);
  process.exit(1);
});

