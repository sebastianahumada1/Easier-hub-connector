import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Cliente para la API de GoHighLevel (GHL)
 */
export class GHLClient {
  private axios: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'https://rest.gohighlevel.com/v1') {
    this.apiKey = apiKey;
    this.axios = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para logging y manejo de rate limits
    this.axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          console.warn('GHL: Rate limit alcanzado, esperando antes de reintentar...');
          await this.delay(5000); // Esperar 5 segundos
          return this.axios.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Realiza una petición GET a la API de GHL
   */
  async get<T = any>(endpoint: string, params: any = {}): Promise<T> {
    try {
      const config: AxiosRequestConfig = {
        params,
      };
      const response = await this.axios.get(endpoint, config);
      return response.data;
    } catch (error: any) {
      console.error(`GHL: Error en GET ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Realiza una petición POST a la API de GHL
   */
  async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    try {
      const response = await this.axios.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      console.error(`GHL: Error en POST ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delay helper para rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function para crear un cliente de GHL
 */
export function createGHLClient(apiKey: string): GHLClient {
  return new GHLClient(apiKey);
}

