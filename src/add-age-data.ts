import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { createFacebookClient } from './facebookClient';
import { storage } from './storage';
import { BigQueryUploader } from './bigquery-uploader';

dotenv.config();

/**
 * Script para agregar datos de edad a reportes CSV existentes
 */
async function addAgeData() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Agregar Datos de Edad a Reportes Existentes');
  console.log('='.repeat(150));
  console.log();

  const reportsDir = path.join(process.cwd(), 'reports');
  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.csv')).sort().reverse();

  if (files.length === 0) {
    console.error('FacebookTokenManager: No se encontraron reportes CSV en el directorio reports/');
    process.exit(1);
  }

  // Usar los 2 archivos más recientes (uno por app)
  const latestFiles = files.slice(0, 2);
  console.log(`FacebookTokenManager: Procesando archivos: ${latestFiles.join(', ')}\n`);

  const allTokens = storage.getAllTokens();
  const allReports: any[] = [];

  for (const file of latestFiles) {
    const filePath = path.join(reportsDir, file);
    console.log(`FacebookTokenManager: Leyendo ${file}...`);

    // Determinar qué app es basándose en el nombre del archivo
    const appNum = file.includes('app1') ? 0 : 1;
    const tokenData = allTokens[appNum];

    if (!tokenData) {
      console.log(`FacebookTokenManager: No se encontró token para ${file}, saltando...\n`);
      continue;
    }

    const client = createFacebookClient(tokenData.appId);
    const campaigns = new Map<string, any>();
    
    // Leer CSV y extraer campañas únicas con sus datos
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: any) => {
          if (row['ID Campaña'] && row['ID Campaña'].trim() !== '') {
            const campaignId = row['ID Campaña'];
            if (!campaigns.has(campaignId)) {
              campaigns.set(campaignId, {
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
            
            // Recolectar demografía
            const campaign = campaigns.get(campaignId);
            
            if (row['Género'] && row['Género'].trim() !== '') {
              campaign.demographics.byGender.push({
                gender: row['Género'],
                impressions: parseInt(row['Impresiones (Género)']) || 0,
                clicks: parseInt(row['Clicks (Género)']) || 0,
                spend: parseFloat(row['Gasto (Género)']) || 0,
              });
            }
            
            if (row['País'] && row['País'].trim() !== '') {
              campaign.demographics.byCountry.push({
                country: row['País'],
                impressions: parseInt(row['Impresiones (País)']) || 0,
                clicks: parseInt(row['Clicks (País)']) || 0,
                spend: parseFloat(row['Gasto (País)']) || 0,
              });
            }
            
            if (row['Región'] && row['Región'].trim() !== '') {
              campaign.demographics.byRegion.push({
                region: row['Región'],
                country: row['País (Región)'],
                impressions: parseInt(row['Impresiones (Región)']) || 0,
                clicks: parseInt(row['Clicks (Región)']) || 0,
                spend: parseFloat(row['Gasto (Región)']) || 0,
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`FacebookTokenManager: Encontradas ${campaigns.size} campañas únicas`);
    console.log(`FacebookTokenManager: Consultando datos de edad...\n`);

    // Consultar edad para cada campaña
    let processed = 0;
    for (const [campaignId, campaign] of campaigns) {
      try {
        processed++;
        console.log(`FacebookTokenManager: [${processed}/${campaigns.size}] Consultando edad para "${campaign.campaignName}"...`);
        
        const ageInsights = await client.get(`/${campaignId}/insights`, {
          fields: 'impressions,clicks,spend',
          breakdowns: 'age',
          time_range: JSON.stringify({
            since: '2025-10-01',
            until: '2025-10-31'
          }),
        });

        const byAge = (ageInsights.data || []).map((item: any) => ({
          age: item.age || 'Unknown',
          impressions: parseInt(item.impressions) || 0,
          clicks: parseInt(item.clicks) || 0,
          spend: parseFloat(item.spend) || 0,
        }));

        campaign.demographics.byAge = byAge;
        
      } catch (error: any) {
        console.error(`FacebookTokenManager: Error consultando edad: ${error.message}`);
      }
    }

    // Convertir a array
    allReports.push(...Array.from(campaigns.values()));
    console.log(`FacebookTokenManager: ✓ ${file} procesado\n`);
  }

  console.log(`\nFacebookTokenManager: Total de campañas con datos: ${allReports.length}\n`);

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

addAgeData();

