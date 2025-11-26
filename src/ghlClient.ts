import axios, { AxiosInstance, AxiosError } from 'axios';
import { GHLAppointment, GHLLocation } from './types';

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
      let skip = 0;
      const limit = 100; // Máximo por página
      let hasMore = true;

      // Convertir fechas a timestamps (inicio del día y fin del día)
      const startTimestamp = new Date(`${startDate}T00:00:00Z`).getTime();
      const endTimestamp = new Date(`${endDate}T23:59:59Z`).getTime();

      while (hasMore) {
        try {
          const response = await this.axios.get(`/calendars/events`, {
            params: {
              locationId,
              startTime: startTimestamp,
              endTime: endTimestamp,
              limit,
              skip,
            },
          });

          if (response.data && response.data.events) {
            const appointments = response.data.events;
            allAppointments.push(...appointments);
            
            console.log(`GHL: Obtenidos ${appointments.length} appointments (skip: ${skip})`);
            
            // Si obtuvimos menos que el límite, no hay más páginas
            if (appointments.length < limit) {
              hasMore = false;
            } else {
              skip += limit;
            }
          } else {
            hasMore = false;
          }
        } catch (error: any) {
          console.error(`GHL: Error en paginación (skip: ${skip}):`, error.message);
          hasMore = false;
        }
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

