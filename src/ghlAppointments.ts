import { GHLClient } from './ghlClient';
import { GHLAppointmentMetrics } from './types';

interface GHLAppointment {
  id: string;
  calendarId: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  status?: string;
  appointmentStatus?: string;
  confirmed?: boolean;
  paid?: boolean;
  showed?: boolean;
  [key: string]: any;
}

/**
 * Manager para obtener y procesar appointments de GHL
 */
export class GHLAppointmentsManager {
  private client: GHLClient;

  constructor(client: GHLClient) {
    this.client = client;
  }

  /**
   * Obtiene todos los appointments en un rango de fechas
   */
  async getAppointments(startDate: string, endDate: string): Promise<GHLAppointment[]> {
    try {
      console.log(`GHL: Obteniendo appointments desde ${startDate} hasta ${endDate}...`);
      
      // Intentar endpoint de appointments
      // La estructura exacta depende de la API de GHL
      const response = await this.client.get('/appointments', {
        startDate,
        endDate,
      });

      // GHL podría devolver los datos en response.appointments o response.data
      const appointments = response.appointments || response.data || response || [];
      
      console.log(`GHL: ${appointments.length} appointments encontrados`);
      return appointments;
    } catch (error: any) {
      console.error('GHL: Error obteniendo appointments:', error.message);
      
      // Intentar endpoint alternativo si el primero falla
      try {
        console.log('GHL: Intentando endpoint alternativo /calendars/events...');
        const response = await this.client.get('/calendars/events', {
          startDate,
          endDate,
        });
        const appointments = response.events || response.data || response || [];
        console.log(`GHL: ${appointments.length} appointments encontrados (endpoint alternativo)`);
        return appointments;
      } catch (altError: any) {
        console.error('GHL: Error en endpoint alternativo:', altError.message);
        return [];
      }
    }
  }

  /**
   * Calcula las métricas de appointments
   */
  calculateMetrics(
    appointments: GHLAppointment[],
    accountId: string,
    accountName: string,
    date: string
  ): GHLAppointmentMetrics {
    // Total scheduled: todos los appointments (sin importar status)
    const totalScheduled = appointments.length;

    // Scheduled paid: appointments marcados como pagados
    const scheduledPaid = appointments.filter(apt => 
      apt.paid === true || 
      apt.status === 'paid' || 
      apt.appointmentStatus === 'paid'
    ).length;

    // Showed: appointments donde el cliente apareció
    const showed = appointments.filter(apt => 
      apt.showed === true || 
      apt.status === 'showed' || 
      apt.status === 'completed' ||
      apt.appointmentStatus === 'showed' ||
      apt.appointmentStatus === 'completed'
    ).length;

    // Closed: appointments cerrados/ganados
    const closed = appointments.filter(apt => 
      apt.status === 'closed' || 
      apt.status === 'won' ||
      apt.appointmentStatus === 'closed' ||
      apt.appointmentStatus === 'won'
    ).length;

    // Scheduled confirmed: appointments confirmados
    const scheduledConfirmed = appointments.filter(apt => 
      apt.confirmed === true || 
      apt.status === 'confirmed' ||
      apt.appointmentStatus === 'confirmed'
    ).length;

    return {
      accountId,
      accountName,
      date,
      totalScheduled,
      scheduledPaid,
      showed,
      closed,
      scheduledConfirmed,
    };
  }

  /**
   * Obtiene las métricas de appointments para un rango de fechas
   */
  async getMetrics(
    startDate: string,
    endDate: string,
    accountId: string,
    accountName: string
  ): Promise<GHLAppointmentMetrics> {
    const appointments = await this.getAppointments(startDate, endDate);
    return this.calculateMetrics(appointments, accountId, accountName, startDate);
  }
}

