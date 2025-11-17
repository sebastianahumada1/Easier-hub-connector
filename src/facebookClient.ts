import axios, { AxiosInstance } from 'axios';
import { storage } from './storage';

const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export class FacebookClient {
  private appId: string;
  private axiosInstance: AxiosInstance;

  constructor(appId: string) {
    this.appId = appId;
    this.axiosInstance = axios.create({
      baseURL: FACEBOOK_GRAPH_URL,
    });
  }

  /**
   * Obtiene el token actual de la app desde el almacenamiento
   */
  private getToken(): string {
    const tokenData = storage.getToken(this.appId);
    
    if (!tokenData) {
      throw new Error(`FacebookTokenManager: No se encontró token para app ${this.appId}`);
    }

    return tokenData.token;
  }

  /**
   * Realiza una petición GET a la API de Facebook
   */
  async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const token = this.getToken();
      const response = await this.axiosInstance.get(endpoint, {
        params: {
          ...params,
          access_token: token,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error en petición GET a ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Realiza una petición POST a la API de Facebook
   */
  async post(endpoint: string, data: Record<string, any> = {}, params: Record<string, any> = {}): Promise<any> {
    try {
      const token = this.getToken();
      const response = await this.axiosInstance.post(endpoint, data, {
        params: {
          ...params,
          access_token: token,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error en petición POST a ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtiene información de la app actual
   */
  async getAppInfo(): Promise<any> {
    return this.get(`/${this.appId}`);
  }

  /**
   * Verifica que el token sea válido haciendo una petición simple
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.get('/me');
      console.log(`FacebookTokenManager: Token válido para app ${this.appId}`);
      return true;
    } catch (error) {
      console.error(`FacebookTokenManager: Token inválido para app ${this.appId}`);
      return false;
    }
  }
}

/**
 * Crea una instancia del cliente de Facebook para una app específica
 */
export function createFacebookClient(appId: string): FacebookClient {
  return new FacebookClient(appId);
}

