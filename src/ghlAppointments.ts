import { GHLClient } from './ghlClient';
import { GHLAppointment, GHLAppointmentMetrics } from './types';

export class GHLAppointmentsManager {
  private client: GHLClient;

  constructor(client: GHLClient) {
    this.client = client;
  }

  /**
   * Obtiene todas las citas para un rango de fechas
   */
  async fetchAppointments(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<GHLAppointment[]> {
    try {
      const appointments = await this.client.getAppointments(locationId, startDate, endDate);
      return appointments;
    } catch (error: any) {
      console.error('GHL Appointments: Error obteniendo citas:', error.message);
      throw error;
    }
  }

  /**
   * Calcula métricas agregadas de las citas
   */
  calculateMetrics(
    appointments: GHLAppointment[],
    locationId: string,
    locationName: string,
    date: string
  ): GHLAppointmentMetrics {
    console.log(`GHL: Calculando métricas para ${appointments.length} appointments`);

    // Inicializar contadores
    let totalScheduled = 0;
    let scheduledPaid = 0;
    let showed = 0;
    let closed = 0;
    let scheduledConfirmed = 0;

    for (const appointment of appointments) {
      const status = (appointment.status || '').toLowerCase();
      const appointmentStatus = (appointment.appointmentStatus || '').toLowerCase();

      // Total programadas: todas las que no están canceladas
      if (status !== 'cancelled' && status !== 'canceled') {
        totalScheduled++;
      }

      // Scheduled paid: citas con status "paid"
      if (status === 'paid') {
        scheduledPaid++;
      }

      // Showed: citas donde el cliente asistió
      if (status === 'showed' || status === 'show' || appointmentStatus === 'showed' || appointmentStatus === 'show') {
        showed++;
      }

      // Closed: citas cerradas/completadas
      if (status === 'closed' || status === 'completed' || appointmentStatus === 'closed' || appointmentStatus === 'completed') {
        closed++;
      }

      // Scheduled confirmed: citas confirmadas
      if (status === 'confirmed') {
        scheduledConfirmed++;
      }
    }

    console.log(`GHL Métricas calculadas:`);
    console.log(`  - Total programadas: ${totalScheduled}`);
    console.log(`  - Programadas pagadas: ${scheduledPaid}`);
    console.log(`  - Asistieron (showed): ${showed}`);
    console.log(`  - Cerradas: ${closed}`);
    console.log(`  - Confirmadas: ${scheduledConfirmed}`);

    return {
      date,
      locationId,
      locationName,
      totalScheduled,
      scheduledPaid,
      showed,
      closed,
      scheduledConfirmed,
    };
  }

  /**
   * Obtiene y calcula métricas para un rango de fechas
   */
  async getMetrics(
    locationId: string,
    locationName: string,
    startDate: string,
    endDate: string
  ): Promise<GHLAppointmentMetrics> {
    try {
      console.log(`GHL: Obteniendo métricas de appointments para ${locationName}`);
      
      const appointments = await this.fetchAppointments(locationId, startDate, endDate);
      
      // Usar la fecha de inicio como referencia para las métricas
      const metrics = this.calculateMetrics(appointments, locationId, locationName, startDate);
      
      return metrics;
    } catch (error: any) {
      console.error('GHL: Error obteniendo métricas:', error.message);
      throw error;
    }
  }

  /**
   * Debug: muestra información detallada de los appointments
   */
  debugAppointments(appointments: GHLAppointment[]): void {
    console.log('\n=== DEBUG: Appointments ===');
    console.log(`Total appointments: ${appointments.length}`);
    
    if (appointments.length > 0) {
      console.log('\nPrimeros 5 appointments:');
      appointments.slice(0, 5).forEach((apt, index) => {
        console.log(`\nAppointment ${index + 1}:`);
        console.log(`  ID: ${apt.id}`);
        console.log(`  Title: ${apt.title}`);
        console.log(`  Status: ${apt.status}`);
        console.log(`  Start: ${apt.startTime}`);
        console.log(`  End: ${apt.endTime}`);
      });
    }

    // Contar por status
    const statusCounts: { [key: string]: number } = {};
    appointments.forEach(apt => {
      const status = apt.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\nDistribución por status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('=========================\n');
  }
}

/**
 * Factory function para crear un manager de appointments
 */
export function createAppointmentsManager(client: GHLClient): GHLAppointmentsManager {
  return new GHLAppointmentsManager(client);
}

