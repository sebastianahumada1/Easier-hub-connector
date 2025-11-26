import axios, { AxiosInstance, AxiosError } from 'axios';
import { GHLAppointment, GHLLocation, GHLCalendar } from './types';

export class GHLClient {
  private apiKey: string;
  private axios: AxiosInstance;
  private baseURL: string = 'https://services.leadconnectorhq.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para logging de errores
    this.axios.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error('GHL API: Error 401 - Token inválido o expirado');
        } else if (error.response?.status === 403) {
          console.error('GHL API: Error 403 - Sin permisos para acceder al recurso');
        }
        throw error;
      }
    );
  }

  /**
   * Obtiene información de un location específico
   */
  async getLocation(locationId: string): Promise<GHLLocation | null> {
    try {
      console.log(`GHL: Obteniendo información del location ${locationId}...`);
      const response = await this.axios.get(`/locations/${locationId}`);
      
      if (response.data && response.data.location) {
        console.log(`GHL: Location encontrado: ${response.data.location.name}`);
        return response.data.location;
      }
      
      return null;
    } catch (error: any) {
      console.error('GHL: Error obteniendo location:', error.message);
      if (error.response?.data) {
        console.error('GHL: Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }

  /**
   * Obtiene todos los calendarios disponibles para un location
   */
  async getCalendars(locationId: string): Promise<GHLCalendar[]> {
    try {
      console.log(`GHL: Obteniendo calendarios para location ${locationId}...`);
      const response = await this.axios.get('/calendars/', { params: { locationId } });
      const calendars: GHLCalendar[] = response.data?.calendars || [];
      console.log(`GHL: Se encontraron ${calendars.length} calendarios activos`);
      return calendars;
    } catch (error: any) {
      console.error('GHL: Error obteniendo calendarios:', error.message);
      if (error.response?.data) {
        console.error('GHL: Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
      return [];
    }
  }

  /**
   * Obtiene eventos para un calendario específico
   */
  private async getCalendarEvents(
    calendarId: string,
    locationId: string,
    startTime: string,
    endTime: string
  ): Promise<GHLAppointment[]> {
    try {
      const response = await this.axios.get('/calendars/events', {
        params: {
          calendarId,
          locationId,
          startTime,
          endTime,
        },
      });

      return response.data?.events || [];
    } catch (error: any) {
      console.error(`GHL: Error obteniendo eventos para calendario ${calendarId}:`, error.message);
      if (error.response?.data) {
        console.error('GHL: Detalles del error del calendario:', JSON.stringify(error.response.data, null, 2));
      }
      return [];
    }
  }

  /**
   * Obtiene appointments para un location y rango de fechas específico
   * @param locationId ID del location
   * @param startDate Fecha inicio en formato YYYY-MM-DD
   * @param endDate Fecha fin en formato YYYY-MM-DD
   */
  async getAppointments(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<GHLAppointment[]> {
    try {
      console.log(`GHL: Obteniendo appointments para location ${locationId}`);
      console.log(`GHL: Rango de fechas: ${startDate} a ${endDate}`);
      
      const allAppointments: GHLAppointment[] = [];
      const startTime = `${startDate}T00:00:00Z`;
      const endTime = `${endDate}T23:59:59Z`;

      const calendars = await this.getCalendars(locationId);

      if (calendars.length === 0) {
        console.warn('GHL: No se encontraron calendarios para el location proporcionado');
        return [];
      }

      for (const calendar of calendars) {
        console.log(`GHL: Obteniendo eventos del calendario "${calendar.name}" (${calendar.id})`);
        const events = await this.getCalendarEvents(calendar.id, locationId, startTime, endTime);

        if (events.length === 0) {
          console.log(`GHL: El calendario ${calendar.name} no tiene eventos en el rango solicitado`);
        }

        events.forEach(event => {
          allAppointments.push({
            ...event,
            calendarId: calendar.id,
            calendarName: calendar.name,
          } as GHLAppointment);
        });
      }

      console.log(`GHL: Total de appointments obtenidos: ${allAppointments.length}`);
      return allAppointments;
    } catch (error: any) {
      console.error('GHL: Error obteniendo appointments:', error.message);
      if (error.response?.data) {
        console.error('GHL: Detalles del error:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Método genérico para hacer requests GET
   */
  async get(endpoint: string, params?: any): Promise<any> {
    try {
      const response = await this.axios.get(endpoint, { params });
      return response.data;
    } catch (error: any) {
      console.error(`GHL: Error en GET ${endpoint}:`, error.message);
      throw error;
    }
  }
}

/**
 * Factory function para crear un cliente GHL
 */
export function createGHLClient(apiKey: string): GHLClient {
  return new GHLClient(apiKey);
}

