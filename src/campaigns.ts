import { FacebookClient } from './facebookClient';

export class CampaignsManager {
  private client: FacebookClient;

  constructor(client: FacebookClient) {
    this.client = client;
  }

  /**
   * Obtiene todas las cuentas de anuncios asociadas
   */
  async getAdAccounts() {
    try {
      console.log('FacebookTokenManager: Obteniendo cuentas de anuncios...');
      
      const accounts = await this.client.get('/me/adaccounts', {
        fields: 'id,name,account_id,account_status,currency,timezone_name,balance,amount_spent',
      });

      return accounts.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo cuentas de anuncios:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene campañas de una cuenta de anuncios
   */
  async getCampaigns(adAccountId: string) {
    try {
      console.log(`FacebookTokenManager: Obteniendo campañas de cuenta ${adAccountId}...`);
      
      const campaigns = await this.client.get(`/${adAccountId}/campaigns`, {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
        limit: 100,
      });

      return campaigns.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo campañas:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene insights de una campaña específica
   */
  async getCampaignInsights(campaignId: string, params?: {
    date_preset?: string;
    time_range?: { since: string; until: string };
    fields?: string[];
  }) {
    try {
      console.log(`FacebookTokenManager: Obteniendo insights de campaña ${campaignId}...`);
      
      const defaultFields = [
        'impressions',
        'clicks',
        'spend',
        'reach',
        'cpc',
        'cpm',
        'ctr',
        'frequency',
        'actions',
        'cost_per_action_type',
      ];

      const insights = await this.client.get(`/${campaignId}/insights`, {
        fields: (params?.fields || defaultFields).join(','),
        date_preset: params?.date_preset || 'last_30d',
        time_range: params?.time_range ? JSON.stringify(params.time_range) : undefined,
      });

      return insights.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo insights de campaña:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene conjuntos de anuncios de una campaña
   */
  async getAdSets(campaignId: string) {
    try {
      console.log(`FacebookTokenManager: Obteniendo ad sets de campaña ${campaignId}...`);
      
      const adsets = await this.client.get(`/${campaignId}/adsets`, {
        fields: 'id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount',
        limit: 100,
      });

      return adsets.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo ad sets:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene anuncios de un conjunto de anuncios
   */
  async getAds(adSetId: string) {
    try {
      console.log(`FacebookTokenManager: Obteniendo anuncios de ad set ${adSetId}...`);
      
      const ads = await this.client.get(`/${adSetId}/ads`, {
        fields: 'id,name,status,creative{id,name,title,body,image_url,video_id},targeting',
        limit: 100,
      });

      return ads.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo anuncios:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Obtiene insights consolidados de una cuenta de anuncios
   */
  async getAccountInsights(adAccountId: string, params?: {
    date_preset?: string;
    time_range?: { since: string; until: string };
    level?: 'account' | 'campaign' | 'adset' | 'ad';
  }) {
    try {
      console.log(`FacebookTokenManager: Obteniendo insights de cuenta ${adAccountId}...`);
      
      const insights = await this.client.get(`/${adAccountId}/insights`, {
        fields: 'impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type',
        date_preset: params?.date_preset || 'last_30d',
        time_range: params?.time_range ? JSON.stringify(params.time_range) : undefined,
        level: params?.level || 'account',
      });

      return insights.data || [];
    } catch (error: any) {
      console.error('FacebookTokenManager: Error obteniendo insights de cuenta:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }
}

