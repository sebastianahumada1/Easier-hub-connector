import { GHLClient } from './ghlClient';
import { GHLFunnelMetrics } from './types';

interface GHLPage {
  id: string;
  name: string;
  url?: string;
  uniqueViews?: number;
  views?: number;
  conversions?: number;
  optIns?: number;
  submissions?: number;
  [key: string]: any;
}

interface GHLPageAnalytics {
  pageId: string;
  pageName: string;
  uniqueViews: number;
  optIns: number;
}

/**
 * Manager para obtener y procesar funnels/landing pages de GHL
 */
export class GHLFunnelsManager {
  private client: GHLClient;

  constructor(client: GHLClient) {
    this.client = client;
  }

  /**
   * Obtiene las páginas/funnels en un rango de fechas
   */
  async getFunnelPages(startDate: string, endDate: string): Promise<GHLPage[]> {
    try {
      console.log(`GHL: Obteniendo funnels/páginas desde ${startDate} hasta ${endDate}...`);
      
      // Intentar endpoint de funnels
      const response = await this.client.get('/funnels', {
        startDate,
        endDate,
      });

      const pages = response.funnels || response.pages || response.data || response || [];
      
      console.log(`GHL: ${pages.length} páginas encontradas`);
      return pages;
    } catch (error: any) {
      console.error('GHL: Error obteniendo funnels:', error.message);
      
      // Intentar endpoint alternativo
      try {
        console.log('GHL: Intentando endpoint alternativo /sites/pages...');
        const response = await this.client.get('/sites/pages', {
          startDate,
          endDate,
        });
        const pages = response.pages || response.data || response || [];
        console.log(`GHL: ${pages.length} páginas encontradas (endpoint alternativo)`);
        return pages;
      } catch (altError: any) {
        console.error('GHL: Error en endpoint alternativo:', altError.message);
        return [];
      }
    }
  }

  /**
   * Obtiene analytics de una página específica
   */
  async getPageAnalytics(pageId: string, startDate: string, endDate: string): Promise<GHLPageAnalytics | null> {
    try {
      const response = await this.client.get(`/funnels/${pageId}/analytics`, {
        startDate,
        endDate,
      });

      return {
        pageId,
        pageName: response.name || pageId,
        uniqueViews: response.uniqueViews || response.views || 0,
        optIns: response.optIns || response.conversions || response.submissions || 0,
      };
    } catch (error: any) {
      console.error(`GHL: Error obteniendo analytics de página ${pageId}:`, error.message);
      return null;
    }
  }

  /**
   * Identifica funnels por nombre y calcula métricas
   */
  async calculateFunnelMetrics(
    pages: GHLPage[],
    accountId: string,
    accountName: string,
    date: string,
    startDate: string,
    endDate: string
  ): Promise<GHLFunnelMetrics[]> {
    const funnelKeywords = [
      { keyword: 'qualifying', name: 'Qualifying Funnel' },
      { keyword: 'survey', name: 'Survey Funnel' },
      { keyword: 'google', name: 'Google Ads Funnel' },
    ];

    const metrics: GHLFunnelMetrics[] = [];

    for (const { keyword, name: funnelName } of funnelKeywords) {
      // Buscar páginas que coincidan con el keyword (case insensitive)
      const matchingPages = pages.filter(page => 
        page.name && page.name.toLowerCase().includes(keyword.toLowerCase())
      );

      console.log(`GHL: ${matchingPages.length} página(s) encontrada(s) para "${funnelName}"`);

      if (matchingPages.length === 0) {
        // Si no hay páginas, crear métrica con valores en 0
        metrics.push({
          accountId,
          accountName,
          date,
          funnelName,
          optInRate: 0,
          uniqueViews: 0,
          optIns: 0,
        });
        continue;
      }

      // Procesar cada página matching
      for (const page of matchingPages) {
        // Intentar obtener analytics si no están en el objeto page
        let uniqueViews = page.uniqueViews || page.views || 0;
        let optIns = page.optIns || page.conversions || page.submissions || 0;

        // Si los datos no están disponibles, intentar obtenerlos del endpoint de analytics
        if (uniqueViews === 0 && page.id) {
          const analytics = await this.getPageAnalytics(page.id, startDate, endDate);
          if (analytics) {
            uniqueViews = analytics.uniqueViews;
            optIns = analytics.optIns;
          }
        }

        // Calcular opt-in rate
        const optInRate = uniqueViews > 0 ? (optIns / uniqueViews) * 100 : 0;

        metrics.push({
          accountId,
          accountName,
          date,
          funnelName: `${funnelName} - ${page.name}`,
          optInRate: parseFloat(optInRate.toFixed(2)),
          uniqueViews,
          optIns,
        });
      }
    }

    return metrics;
  }

  /**
   * Obtiene las métricas de funnels para un rango de fechas
   */
  async getMetrics(
    startDate: string,
    endDate: string,
    accountId: string,
    accountName: string
  ): Promise<GHLFunnelMetrics[]> {
    const pages = await this.getFunnelPages(startDate, endDate);
    return this.calculateFunnelMetrics(pages, accountId, accountName, startDate, startDate, endDate);
  }
}

