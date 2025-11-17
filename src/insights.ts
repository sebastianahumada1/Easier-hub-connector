import { FacebookClient } from './facebookClient';

export interface InsightsParams {
  metric: string[];
  period?: 'day' | 'week' | 'days_28' | 'month' | 'lifetime';
  since?: string;
  until?: string;
}

export class InsightsManager {
  private client: FacebookClient;

  constructor(client: FacebookClient) {
    this.client = client;
  }

  /**
   * Obtiene insights de una página de Facebook
   */
  async getPageInsights(pageId: string, pageAccessToken: string, params: InsightsParams) {
    try {
      console.log(`FacebookTokenManager: Obteniendo insights de página ${pageId}...`);
      
      const insights = await this.client.get(`/${pageId}/insights`, {
        metric: params.metric.join(','),
        period: params.period || 'day',
        since: params.since,
        until: params.until,
        access_token: pageAccessToken,
      });

      return insights.data || [];
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error obteniendo insights de página:`, error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene insights de cuenta de Instagram Business
   */
  async getInstagramInsights(igAccountId: string, params: InsightsParams) {
    try {
      console.log(`FacebookTokenManager: Obteniendo insights de Instagram ${igAccountId}...`);
      
      const insights = await this.client.get(`/${igAccountId}/insights`, {
        metric: params.metric.join(','),
        period: params.period || 'day',
        since: params.since,
        until: params.until,
      });

      return insights.data || [];
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error obteniendo insights de Instagram:`, error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene métricas de un post específico
   */
  async getPostInsights(postId: string, metrics: string[]) {
    try {
      const insights = await this.client.get(`/${postId}/insights`, {
        metric: metrics.join(','),
      });

      return insights.data || [];
    } catch (error: any) {
      console.error(`FacebookTokenManager: Error obteniendo insights de post:`, error.response?.data?.error?.message || error.message);
      throw error;
    }
  }
}

