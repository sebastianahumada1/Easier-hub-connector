import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createFacebookClient } from './facebookClient';
import { storage } from './storage';
import { BigQueryUploader } from './bigquery-uploader';

dotenv.config();

/**
 * Script para obtener TODA la demografía (gender, country, region, age) y subir a BigQuery
 */
async function fullDemographics() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Obtener Demografía Completa (Gender, Country, Region, Age)');
  console.log('='.repeat(150));
  console.log();

  const reportsDir = path.join(process.cwd(), 'reports');
  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.csv')).sort().reverse();

  if (files.length === 0) {
    console.error('FacebookTokenManager: No se encontraron reportes CSV');
    process.exit(1);
  }

  // Buscar el archivo más reciente de cada app
  const app1File = files.find(f => f.includes('app1'));
  const app2File = files.find(f => f.includes('app2'));
  
  const latestFiles = [app1File, app2File].filter(Boolean) as string[];
  
  if (latestFiles.length === 0) {
    console.error('FacebookTokenManager: No se encontraron archivos de reportes');
    process.exit(1);
  }
  
  console.log(`FacebookTokenManager: Procesando archivos: ${latestFiles.join(', ')}\n`);

  const allTokens = storage.getAllTokens();
  const allReports: any[] = [];

  for (const file of latestFiles) {
    const filePath = path.join(reportsDir, file);
    console.log(`FacebookTokenManager: Leyendo ${file}...`);

    const appNum = file.includes('app1') ? 0 : 1;
    const tokenData = allTokens[appNum];

    if (!tokenData) {
      console.log(`FacebookTokenManager: No se encontró token, saltando...\n`);
      continue;
    }

    const client = createFacebookClient(tokenData.appId);
    const campaigns = new Map<string, any>();
    
    // Leer CSV y extraer campañas únicas
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          if (row['ID Campaña'] && row['ID Campaña'].trim() !== '') {
            const campaignId = row['ID Campaña'];
            if (!campaigns.has(campaignId)) {
              campaigns.set(campaignId, {
                appId: tokenData.appId,
                campaignId,
                campaignName: row['Nombre Campaña'],
                accountName: row['Nombre de Cuenta'],
                accountId: row['ID de Cuenta'],
                status: row['Estado'],
                dateStart: row['Fecha Inicio'],
                dateEnd: row['Fecha Fin'],
                spend: parseFloat(row['Gasto']) || 0,
                leads: parseInt(row['Leads']) || 0,
                costPerLead: parseFloat(row['Costo por Lead']) || 0,
                impressions: parseInt(row['Impresiones']) || 0,
                clicks: parseInt(row['Clicks']) || 0,
                reach: parseInt(row['Alcance']) || 0,
                ctr: parseFloat(row['CTR']) || 0,
                cpc: parseFloat(row['CPC']) || 0,
                cpm: parseFloat(row['CPM']) || 0,
                demographics: {
                  byGender: [],
                  byCountry: [],
                  byRegion: [],
                  byAge: []
                }
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`FacebookTokenManager: Encontradas ${campaigns.size} campañas`);
    console.log(`FacebookTokenManager: Consultando demografía completa (gender, country, region, age)...\n`);

    // Consultar TODA la demografía para cada campaña
    let processed = 0;
    for (const [campaignId, campaign] of campaigns) {
      try {
        processed++;
        console.log(`FacebookTokenManager: [${processed}/${campaigns.size}] "${campaign.campaignName}"...`);
        
        const timeRange = JSON.stringify({
          since: '2025-10-01',
          until: '2025-10-31'
        });

        // Género
        const genderInsights = await client.get(`/${campaignId}/insights`, {
          fields: 'impressions,clicks,spend',
          breakdowns: 'gender',
          time_range: timeRange,
        });

        campaign.demographics.byGender = (genderInsights.data || []).map((item: any) => ({
          gender: item.gender === 'male' ? 'Male' : item.gender === 'female' ? 'Female' : 'Unknown',
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
        }));

        // País
        const countryInsights = await client.get(`/${campaignId}/insights`, {
          fields: 'impressions,clicks,spend',
          breakdowns: 'country',
          time_range: timeRange,
        });

        campaign.demographics.byCountry = (countryInsights.data || []).map((item: any) => ({
          country: item.country || 'Unknown',
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
        }));

        // Región
        const regionInsights = await client.get(`/${campaignId}/insights`, {
          fields: 'impressions,clicks,spend',
          breakdowns: 'region',
          time_range: timeRange,
        });

        campaign.demographics.byRegion = (regionInsights.data || []).map((item: any) => ({
          region: item.region || 'Unknown',
          country: item.country || 'Unknown',
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
        }));

        // Edad
        const ageInsights = await client.get(`/${campaignId}/insights`, {
          fields: 'impressions,clicks,spend',
          breakdowns: 'age',
          time_range: timeRange,
        });

        campaign.demographics.byAge = (ageInsights.data || []).map((item: any) => ({
          age: item.age || 'Unknown',
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
        }));
        
      } catch (error: any) {
        console.error(`FacebookTokenManager: Error: ${error.message}`);
      }
    }

    allReports.push(...Array.from(campaigns.values()));
    console.log(`FacebookTokenManager: ✓ ${file} procesado\n`);
  }

  console.log(`\nFacebookTokenManager: Total de campañas: ${allReports.length}`);
  
  // Calcular total de filas demográficas
  let totalDemoRows = 0;
  for (const report of allReports) {
    totalDemoRows += report.demographics.byGender.length;
    totalDemoRows += report.demographics.byCountry.length;
    totalDemoRows += report.demographics.byRegion.length;
    totalDemoRows += report.demographics.byAge.length;
  }
  console.log(`FacebookTokenManager: Total de filas demográficas: ${totalDemoRows}\n`);

  // Subir a BigQuery
  if (process.env.BIGQUERY_ENABLED === 'true' && allReports.length > 0) {
    try {
      console.log('FacebookTokenManager: Subiendo a BigQuery...');
      
      const uploader = new BigQueryUploader(
        process.env.BIGQUERY_PROJECT_ID!,
        process.env.BIGQUERY_DATASET_ID!,
        process.env.BIGQUERY_TABLE_ID!,
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

      const connected = await uploader.testConnection();
      if (connected) {
        await uploader.createTableIfNotExists();
        await uploader.uploadFromReports(allReports);
        console.log('✅ Datos subidos a BigQuery exitosamente\n');
      }
    } catch (error: any) {
      console.error('❌ Error subiendo a BigQuery:', error.message);
    }
  }

  console.log('='.repeat(150));
  console.log('✅ Proceso completado');
  console.log('='.repeat(150));
}

fullDemographics();

