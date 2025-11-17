import axios from 'axios';
import { FacebookApp, TokenResponse, TokenDebugResponse } from './types';

const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export class TokenManager {
  /**
   * Convierte un token de corta duración a un token de larga duración (60 días)
   */
  async exchangeForLongLivedToken(app: FacebookApp): Promise<string> {
    try {
      console.log(`FacebookTokenManager: Intercambiando token para app ${app.id}...`);
      
      const response = await axios.get<TokenResponse>(`${FACEBOOK_GRAPH_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: app.id,
          client_secret: app.secret,
          fb_exchange_token: app.token,
        },
      });

      const newToken = response.data.access_token;
      console.log(`FacebookTokenManager: Token intercambiado exitosamente para app ${app.id}`);
      
      return newToken;
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error intercambiando token para app ${app.id}:`, error.response?.data || error.message);
      throw new Error(`No se pudo intercambiar el token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Obtiene información sobre el token actual incluyendo fecha de expiración
   */
  async getTokenInfo(token: string): Promise<TokenDebugResponse['data']> {
    try {
      const response = await axios.get<TokenDebugResponse>(`${FACEBOOK_GRAPH_URL}/debug_token`, {
        params: {
          input_token: token,
          access_token: token,
        },
      });

      return response.data.data;
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo información del token:', error.response?.data || error.message);
      throw new Error(`No se pudo obtener información del token: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Verifica si el token necesita renovación (menos de 7 días para expirar)
   */
  needsRenewal(expiresAt: number): boolean {
    const now = Date.now();
    const expirationDate = expiresAt * 1000; // Convertir a milisegundos
    const daysUntilExpiration = (expirationDate - now) / (1000 * 60 * 60 * 24);
    
    return daysUntilExpiration < 7;
  }

  /**
   * Obtiene los días restantes hasta la expiración del token
   */
  getDaysUntilExpiration(expiresAt: number): number {
    const now = Date.now();
    const expirationDate = expiresAt * 1000;
    const days = Math.floor((expirationDate - now) / (1000 * 60 * 60 * 24));
    
    return days > 0 ? days : 0;
  }
}

export const tokenManager = new TokenManager();

