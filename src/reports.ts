import { CampaignsManager } from './campaigns';
import { FacebookClient } from './facebookClient';
import * as fs from 'fs';
import * as path from 'path';

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  accountName: string;
  accountId: string;
  status: string;
  dateStart: string;
  dateEnd: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerLead: number;
  demographics: {
    byGender: Array<{ gender: string; impressions: number; clicks: number; spend: number }>;
    byCountry: Array<{ country: string; impressions: number; clicks: number; spend: number }>;
    byRegion: Array<{ region: string; country: string; impressions: number; clicks: number; spend: number }>;
    byAge: Array<{ age: string; impressions: number; clicks: number; spend: number }>;
  };
}

export class ReportsManager {
  private campaignsManager: CampaignsManager;
  private client: FacebookClient;

  constructor(client: FacebookClient) {
    this.client = client;
    this.campaignsManager = new CampaignsManager(client);
  }

  /**
   * Obtiene reporte completo de todas las campañas con métricas y demografía
   */
  async getCampaignsReport(params?: {
    date_preset?: string;
    time_range?: { since: string; until: string };
  }): Promise<CampaignReport[]> {
    console.log('FacebookTokenManager: Generando reporte de campañas...');
    
    const reports: CampaignReport[] = [];
    
    try {
      // Obtener cuentas de anuncios
      const adAccounts = await this.campaignsManager.getAdAccounts();
      
      for (const account of adAccounts) {
        console.log(`FacebookTokenManager: Procesando cuenta ${account.name}...`);
        
        // Obtener campañas
        const campaigns = await this.campaignsManager.getCampaigns(account.id);
        
        for (const campaign of campaigns) {
          console.log(`FacebookTokenManager: Obteniendo métricas de campaña "${campaign.name}"...`);
          
          try {
            // Obtener insights generales
            const generalParams: any = {
              fields: 'impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type,date_start,date_stop',
            };
            if (params?.time_range) {
              generalParams.time_range = JSON.stringify(params.time_range);
            } else {
              generalParams.date_preset = params?.date_preset || 'lifetime';
            }
            const generalInsights = await this.client.get(`/${campaign.id}/insights`, generalParams);

            // Preparar parámetros demográficos
            const demoParams: any = {
              fields: 'impressions,clicks,spend',
            };
            if (params?.time_range) {
              demoParams.time_range = JSON.stringify(params.time_range);
            } else {
              demoParams.date_preset = params?.date_preset || 'lifetime';
            }

            // Obtener insights por género
            const genderInsights = await this.client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'gender',
            });

            // Obtener insights por país
            const countryInsights = await this.client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'country',
            });

            // Obtener insights por región
            const regionInsights = await this.client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'region',
            });

            // Obtener insights por edad
            const ageInsights = await this.client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'age',
            });

            if (generalInsights.data && generalInsights.data.length > 0) {
              const data = generalInsights.data[0];
              
              // Extraer número de leads de las acciones
              let leads = 0;
              let costPerLead = 0;
              
              if (data.actions) {
                const leadAction = data.actions.find((action: any) => 
                  action.action_type === 'lead' || 
                  action.action_type === 'onsite_conversion.lead_grouped'
                );
                if (leadAction) {
                  leads = parseInt(leadAction.value) || 0;
                }
              }
              
              if (data.cost_per_action_type) {
                const leadCost = data.cost_per_action_type.find((cost: any) => 
                  cost.action_type === 'lead' || 
                  cost.action_type === 'onsite_conversion.lead_grouped'
                );
                if (leadCost) {
                  costPerLead = parseFloat(leadCost.value) || 0;
                }
              }

              // Procesar datos demográficos por género
              const byGender = (genderInsights.data || []).map((item: any) => ({
                gender: this.formatGender(item.gender),
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
              }));

              // Procesar datos demográficos por país
              const byCountry = (countryInsights.data || []).map((item: any) => ({
                country: item.country || 'Unknown',
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
              }));

              // Procesar datos demográficos por región
              const byRegion = (regionInsights.data || []).map((item: any) => ({
                region: item.region || 'Unknown',
                country: item.country || 'Unknown',
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
              }));

              // Procesar datos demográficos por edad
              const byAge = (ageInsights.data || []).map((item: any) => ({
                age: item.age || 'Unknown',
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
              }));

              reports.push({
                campaignId: campaign.id,
                campaignName: campaign.name,
                accountName: account.name,
                accountId: account.account_id,
                status: campaign.status,
                dateStart: data.date_start,
                dateEnd: data.date_stop,
                spend: parseFloat(data.spend) || 0,
                leads: leads,
                impressions: parseInt(data.impressions) || 0,
                clicks: parseInt(data.clicks) || 0,
                reach: parseInt(data.reach) || 0,
                ctr: parseFloat(data.ctr) || 0,
                cpc: parseFloat(data.cpc) || 0,
                cpm: parseFloat(data.cpm) || 0,
                costPerLead: costPerLead,
                demographics: {
                  byGender,
                  byCountry,
                  byRegion,
                  byAge,
                },
              });
            }
          } catch (error: any) {
            console.error(`FacebookTokenManager: Error obteniendo métricas de campaña ${campaign.name}:`, error.response?.data?.error?.message || error.message);
          }
        }
      }
      
      console.log(`FacebookTokenManager: Reporte generado con ${reports.length} campaña(s)`);
      return reports;
      
    } catch (error: any) {
      console.error('FacebookTokenManager: Error generando reporte:', error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Formatea el género para mejor legibilidad
   */
  private formatGender(gender: string): string {
    const genderMap: { [key: string]: string } = {
      'male': 'Male',
      'female': 'Female',
      'unknown': 'Unknown',
    };
    return genderMap[gender] || gender;
  }

  /**
   * Exporta el reporte a CSV
   */
  exportToCSV(reports: CampaignReport[], filename: string = 'campaign-report.csv'): string {
    console.log('FacebookTokenManager: Exportando reporte a CSV...');
    
    const outputDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    
    // Crear CSV con todas las métricas
    const csvRows: string[] = [];
    
    // Encabezados
    csvRows.push([
      'ID Campaña',
      'Nombre Campaña',
      'Nombre de Cuenta',
      'ID de Cuenta',
      'Estado',
      'Fecha Inicio',
      'Fecha Fin',
      'Gasto',
      'Leads',
      'Costo por Lead',
      'Impresiones',
      'Clicks',
      'Alcance',
      'CTR',
      'CPC',
      'CPM',
      'Género',
      'Impresiones (Género)',
      'Clicks (Género)',
      'Gasto (Género)',
      'País',
      'Impresiones (País)',
      'Clicks (País)',
      'Gasto (País)',
      'Región',
      'País (Región)',
      'Impresiones (Región)',
      'Clicks (Región)',
      'Gasto (Región)',
      'Edad',
      'Impresiones (Edad)',
      'Clicks (Edad)',
      'Gasto (Edad)',
    ].join(','));

    // Datos
    for (const report of reports) {
      // Fila principal sin demografía
      csvRows.push([
        report.campaignId,
        `"${report.campaignName}"`,
        `"${report.accountName}"`,
        report.accountId,
        report.status,
        report.dateStart,
        report.dateEnd,
        report.spend.toFixed(2),
        report.leads.toString(),
        report.costPerLead > 0 ? report.costPerLead.toFixed(2) : '0',
        report.impressions.toString(),
        report.clicks.toString(),
        report.reach.toString(),
        report.ctr.toFixed(2),
        report.cpc.toFixed(2),
        report.cpm.toFixed(2),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','));

      // Filas con datos de género
      for (const gender of report.demographics.byGender) {
        csvRows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          gender.gender,
          gender.impressions.toString(),
          gender.clicks.toString(),
          gender.spend.toFixed(2),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','));
      }

      // Filas con datos de país
      for (const country of report.demographics.byCountry) {
        csvRows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          country.country,
          country.impressions.toString(),
          country.clicks.toString(),
          country.spend.toFixed(2),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','));
      }

      // Filas con datos de región
      for (const region of report.demographics.byRegion) {
        csvRows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          region.region,
          region.country,
          region.impressions.toString(),
          region.clicks.toString(),
          region.spend.toFixed(2),
          '',
          '',
          '',
          '',
        ].join(','));
      }

      // Filas con datos de edad
      for (const age of report.demographics.byAge) {
        csvRows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          age.age,
          age.impressions.toString(),
          age.clicks.toString(),
          age.spend.toFixed(2),
        ].join(','));
      }
    }

    fs.writeFileSync(filePath, csvRows.join('\n'), 'utf-8');
    console.log(`FacebookTokenManager: Reporte exportado a ${filePath}`);
    
    return filePath;
  }

  /**
   * Muestra el reporte en consola como tabla
   */
  printReport(reports: CampaignReport[]): void {
    console.log('\n' + '='.repeat(150));
    console.log('REPORTE DE CAMPAÑAS PUBLICITARIAS');
    console.log('='.repeat(150));

    for (const report of reports) {
      console.log('\n' + '─'.repeat(150));
      console.log(`📢 Campaña: ${report.campaignName}`);
      console.log('─'.repeat(150));
      
      console.log(`\n📊 Métricas Generales:`);
      console.log(`   ID Campaña:        ${report.campaignId}`);
      console.log(`   Nombre de Cuenta:  ${report.accountName}`);
      console.log(`   ID de Cuenta:      ${report.accountId}`);
      console.log(`   Estado:            ${report.status}`);
      console.log(`   Período:           ${report.dateStart} → ${report.dateEnd}`);
      console.log(`   Gasto Total:       $${report.spend.toFixed(2)}`);
      console.log(`   Leads:             ${report.leads}`);
      console.log(`   Costo por Lead:    ${report.costPerLead > 0 ? '$' + report.costPerLead.toFixed(2) : 'N/A'}`);
      console.log(`   Impresiones:       ${report.impressions.toLocaleString()}`);
      console.log(`   Clicks:            ${report.clicks.toLocaleString()}`);
      console.log(`   Alcance:           ${report.reach.toLocaleString()}`);
      console.log(`   CTR:               ${report.ctr.toFixed(2)}%`);
      console.log(`   CPC:               $${report.cpc.toFixed(2)}`);
      console.log(`   CPM:               $${report.cpm.toFixed(2)}`);

      if (report.demographics.byGender.length > 0) {
        console.log(`\n👥 Distribución por Género:`);
        console.log('   ' + '-'.repeat(80));
        console.log('   Género              Impresiones      Clicks        Gasto');
        console.log('   ' + '-'.repeat(80));
        for (const gender of report.demographics.byGender) {
          console.log(`   ${gender.gender.padEnd(20)} ${gender.impressions.toLocaleString().padStart(12)} ${gender.clicks.toLocaleString().padStart(12)} $${gender.spend.toFixed(2).padStart(10)}`);
        }
      }

      if (report.demographics.byCountry.length > 0) {
        console.log(`\n🌍 Distribución por País (Top 10):`);
        console.log('   ' + '-'.repeat(80));
        console.log('   País                Impresiones      Clicks        Gasto');
        console.log('   ' + '-'.repeat(80));
        const topCountries = report.demographics.byCountry
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 10);
        for (const country of topCountries) {
          console.log(`   ${country.country.padEnd(20)} ${country.impressions.toLocaleString().padStart(12)} ${country.clicks.toLocaleString().padStart(12)} $${country.spend.toFixed(2).padStart(10)}`);
        }
        if (report.demographics.byCountry.length > 10) {
          console.log(`   ... y ${report.demographics.byCountry.length - 10} país(es) más`);
        }
      }

      if (report.demographics.byRegion.length > 0) {
        console.log(`\n📍 Distribución por Región (Top 10):`);
        console.log('   ' + '-'.repeat(100));
        console.log('   Región                      País         Impresiones      Clicks        Gasto');
        console.log('   ' + '-'.repeat(100));
        const topRegions = report.demographics.byRegion
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 10);
        for (const region of topRegions) {
          console.log(`   ${region.region.padEnd(28)} ${region.country.padEnd(13)} ${region.impressions.toLocaleString().padStart(12)} ${region.clicks.toLocaleString().padStart(12)} $${region.spend.toFixed(2).padStart(10)}`);
        }
        if (report.demographics.byRegion.length > 10) {
          console.log(`   ... y ${report.demographics.byRegion.length - 10} región(es) más`);
        }
      }
    }

    console.log('\n' + '='.repeat(150));
    console.log(`Total de campañas en el reporte: ${reports.length}`);
    console.log('='.repeat(150) + '\n');
  }
}

