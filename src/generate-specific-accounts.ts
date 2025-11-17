import * as dotenv from 'dotenv';
import { createFacebookClient } from './facebookClient';
import { storage } from './storage';
import { ReportsManager } from './reports';
import { BigQueryUploader } from './bigquery-uploader';
import axios from 'axios';

dotenv.config();

/**
 * Script para generar reportes de campañas para cuentas específicas
 * y subirlos a una nueva tabla en BigQuery
 */
async function generateSpecificAccountsReport() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Generador de Reportes para Cuentas Específicas');
  console.log('='.repeat(150));
  console.log();

  // Configuración
  const targetAppId = '2479333962419437';
  // Nota: La cuenta 1 y 10 son la misma (1250358740005834), se incluye solo una vez
  const targetAccountIds = [
    '1250358740005834',
    '1524907357765876',
    '395569777696970',
    '680711562605539',
    '457037992989436',
    '591972929329035',
    '1159008332188566',
    '589009630776573',
    '708155928423030',
  ];

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const dateRange = {
    since: formatDate(yesterday),
    until: formatDate(today)
  };

  const newTableId = 'campaign_reports_specific'; // Nueva tabla en BigQuery

  const allTokens = storage.getAllTokens();
  const tokenData = allTokens.find(t => t.appId === targetAppId);

  if (!tokenData) {
    console.error(`FacebookTokenManager: No se encontró token para app ${targetAppId}`);
    process.exit(1);
  }

  console.log(`FacebookTokenManager: Procesando App ID: ${targetAppId}`);
  console.log(`FacebookTokenManager: Cuentas objetivo: ${targetAccountIds.length}`);
  console.log(`FacebookTokenManager: Período: ${dateRange.since} - ${dateRange.until}\n`);

  try {
    const client = createFacebookClient(tokenData.appId);
    const reportsManager = new ReportsManager(client);

    // Obtener TODAS las cuentas con paginación
    console.log('FacebookTokenManager: Obteniendo todas las cuentas de anuncios...');
    let allAccounts: any[] = [];
    let nextUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status,currency,timezone_name,balance,amount_spent&limit=100&access_token=${tokenData.token}`;

    while (nextUrl) {
      try {
        const response = await axios.get(nextUrl);
        const accounts = response.data.data || [];
        allAccounts = allAccounts.concat(accounts);
        
        if (response.data.paging && response.data.paging.next) {
          nextUrl = response.data.paging.next;
        } else {
          nextUrl = '';
        }
      } catch (error: any) {
        console.error('FacebookTokenManager: Error obteniendo cuentas:', error.response?.data || error.message);
        break;
      }
    }

    console.log(`FacebookTokenManager: Total de cuentas encontradas: ${allAccounts.length}\n`);

    // Filtrar solo las cuentas objetivo
    const filteredAccounts = allAccounts.filter(acc => {
      const accountId = acc.account_id || acc.id?.replace('act_', '');
      return targetAccountIds.includes(accountId);
    });

    if (filteredAccounts.length === 0) {
      console.error('FacebookTokenManager: No se encontraron las cuentas especificadas');
      console.log('FacebookTokenManager: Cuentas disponibles:');
      allAccounts.slice(0, 10).forEach(acc => {
        console.log(`  - ${acc.name} (ID: ${acc.account_id || acc.id})`);
      });
      process.exit(1);
    }

    console.log(`FacebookTokenManager: Procesando ${filteredAccounts.length} cuenta(s) objetivo:\n`);
    filteredAccounts.forEach((acc, i) => {
      console.log(`  ${i + 1}. ${acc.name} (ID: ${acc.account_id || acc.id})`);
    });
    console.log();

    // Generar reportes usando ReportsManager pero solo para cuentas filtradas
    // Necesitamos modificar temporalmente getAdAccounts o usar el método directamente
    const allReports: any[] = [];

    for (const account of filteredAccounts) {
      console.log('─'.repeat(150));
      console.log(`FacebookTokenManager: Procesando cuenta ${account.name}...`);
      console.log('─'.repeat(150));
      console.log();

      try {
        // Obtener campañas de esta cuenta
        const campaigns = await reportsManager['campaignsManager'].getCampaigns(account.id);

        for (const campaign of campaigns) {
          console.log(`FacebookTokenManager: Obteniendo métricas de campaña "${campaign.name}"...`);

          try {
            // Obtener insights generales
            const generalParams: any = {
              fields: 'impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type,date_start,date_stop',
              time_range: JSON.stringify(dateRange),
            };
            const generalInsights = await client.get(`/${campaign.id}/insights`, generalParams);

            // Preparar parámetros demográficos
            const demoParams: any = {
              fields: 'impressions,clicks,spend',
              time_range: JSON.stringify(dateRange),
            };

            // Obtener insights por género
            const genderInsights = await client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'gender',
            });

            // Obtener insights por país
            const countryInsights = await client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'country',
            });

            // Obtener insights por región
            const regionInsights = await client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'region',
            });

            // Obtener insights por edad
            const ageInsights = await client.get(`/${campaign.id}/insights`, {
              ...demoParams,
              breakdowns: 'age',
            });

            // Procesar insights generales (misma lógica que ReportsManager)
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
              const formatGender = (gender: string): string => {
                const genderMap: { [key: string]: string } = {
                  'male': 'Male',
                  'female': 'Female',
                  'unknown': 'Unknown',
                };
                return genderMap[gender] || gender;
              };

              const byGender = (genderInsights.data || []).map((item: any) => ({
                gender: formatGender(item.gender),
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

              allReports.push({
                campaignId: campaign.id,
                campaignName: campaign.name,
                accountName: account.name,
                accountId: account.account_id || account.id?.replace('act_', ''),
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
            console.error(`FacebookTokenManager: Error procesando campaña ${campaign.name}:`, error.message);
          }
        }
      } catch (error: any) {
        console.error(`FacebookTokenManager: Error procesando cuenta ${account.name}:`, error.message);
      }
    }

    if (allReports.length === 0) {
      console.log('⚠ No se encontraron campañas con datos en este período\n');
      return;
    }

    console.log(`\n✅ Total de reportes generados: ${allReports.length}\n`);
    
    // Mostrar resumen
    reportsManager.printReport(allReports);

    // Subir a BigQuery en nueva tabla
    if (process.env.BIGQUERY_ENABLED === 'true') {
      try {
        console.log(`FacebookTokenManager: Subiendo a BigQuery (tabla: ${newTableId})...`);
        
        const uploader = new BigQueryUploader(
          process.env.BIGQUERY_PROJECT_ID!,
          process.env.BIGQUERY_DATASET_ID!,
          newTableId, // Usar nueva tabla
          process.env.GOOGLE_APPLICATION_CREDENTIALS
        );

        const connected = await uploader.testConnection();
        if (connected) {
          await uploader.createTableIfNotExists();
          
          // Agregar app_id a cada reporte antes de subirlo
          const reportsWithAppId = allReports.map(report => ({
            ...report,
            appId: targetAppId
          }));
          
          await uploader.uploadFromReports(reportsWithAppId);
          console.log(`✅ Datos subidos a BigQuery exitosamente en tabla: ${newTableId}\n`);
        } else {
          console.log('⚠ No se pudo conectar a BigQuery\n');
        }
      } catch (error: any) {
        console.error('❌ Error subiendo a BigQuery:', error.message);
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Error generando reporte:`, error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Generación de reportes completada');
  console.log('='.repeat(150));
}

// Ejecutar
generateSpecificAccountsReport().catch((error) => {
  console.error('FacebookTokenManager: Error fatal durante la generación de reportes:', error);
  process.exit(1);
});

