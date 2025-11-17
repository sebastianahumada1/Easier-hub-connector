import * as dotenv from 'dotenv';
import { BigQueryUploader, CampaignReportSimplified } from './bigquery-uploader';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

dotenv.config();

/**
 * Script standalone para subir todos los CSVs existentes a BigQuery
 */
async function uploadAllCSVs() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Subir Reportes CSV a BigQuery');
  console.log('='.repeat(150));
  console.log();

  // Verificar configuración
  if (!process.env.BIGQUERY_PROJECT_ID || !process.env.BIGQUERY_DATASET_ID || !process.env.BIGQUERY_TABLE_ID) {
    console.error('FacebookTokenManager: ❌ Error: Faltan variables de entorno de BigQuery');
    console.error('Asegúrate de configurar en .env:');
    console.error('  - BIGQUERY_PROJECT_ID');
    console.error('  - BIGQUERY_DATASET_ID');
    console.error('  - BIGQUERY_TABLE_ID');
    console.error('  - GOOGLE_APPLICATION_CREDENTIALS (opcional)');
    process.exit(1);
  }

  try {
    const uploader = new BigQueryUploader(
      process.env.BIGQUERY_PROJECT_ID,
      process.env.BIGQUERY_DATASET_ID,
      process.env.BIGQUERY_TABLE_ID,
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

    // Verificar conexión
    console.log('FacebookTokenManager: Verificando conexión a BigQuery...');
    const connected = await uploader.testConnection();
    
    if (!connected) {
      console.error('FacebookTokenManager: No se pudo conectar a BigQuery');
      process.exit(1);
    }

    // Crear tabla si no existe
    await uploader.createTableIfNotExists();

    // Buscar archivos CSV
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      console.error('FacebookTokenManager: ❌ No se encontró la carpeta reports/');
      process.exit(1);
    }

    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith('.csv') && f.startsWith('campaign-report-'))
      .sort();

    if (files.length === 0) {
      console.log('FacebookTokenManager: ⚠ No se encontraron archivos CSV para subir');
      console.log('FacebookTokenManager: Ejecuta "npm run report" primero para generar reportes');
      process.exit(0);
    }

    console.log(`\nFacebookTokenManager: Encontrados ${files.length} archivo(s) CSV\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      
      try {
        console.log(`FacebookTokenManager: Procesando ${file}...`);
        
        const rows: any[] = []; // Todas las filas para BigQuery (incluye demografía)
        let currentCampaign: any = null;
        let rowId = 1; // Contador para agrupar fila principal con sub-filas
        
        await new Promise<void>((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row: any) => {
              // Si tiene campaign_id, es una nueva campaña (fila principal)
              if (row['ID Campaña'] && row['ID Campaña'].trim() !== '') {
                currentCampaign = {
                  row_id: rowId,
                  campaign_id: row['ID Campaña'],
                  campaign_name: row['Nombre Campaña'],
                  account_name: row['Nombre de Cuenta'],
                  account_id: row['ID de Cuenta'],
                  status: row['Estado'],
                  date_start: row['Fecha Inicio'],
                  date_end: row['Fecha Fin'],
                  spend: parseFloat(row['Gasto']) || 0,
                  leads: parseInt(row['Leads']) || 0,
                  cost_per_lead: parseFloat(row['Costo por Lead']) || 0,
                  impressions: parseInt(row['Impresiones']) || 0,
                  clicks: parseInt(row['Clicks']) || 0,
                  reach: parseInt(row['Alcance']) || 0,
                  ctr: parseFloat(row['CTR']) || 0,
                  cpc: parseFloat(row['CPC']) || 0,
                  cpm: parseFloat(row['CPM']) || 0,
                  uploaded_at: new Date().toISOString(),
                };
                
                // Agregar la fila principal de la campaña
                rows.push({ ...currentCampaign });
                rowId++; // Incrementar para la siguiente campaña
              } 
              // Si NO tiene campaign_id, es una sub-fila demográfica
              else if (currentCampaign) {
                const baseRow = {
                  row_id: currentCampaign.row_id,
                  campaign_id: currentCampaign.campaign_id,
                  campaign_name: currentCampaign.campaign_name,
                  account_name: currentCampaign.account_name,
                  account_id: currentCampaign.account_id,
                  status: currentCampaign.status,
                  date_start: currentCampaign.date_start,
                  date_end: currentCampaign.date_end,
                  spend: currentCampaign.spend,
                  leads: currentCampaign.leads,
                  cost_per_lead: currentCampaign.cost_per_lead,
                  impressions: currentCampaign.impressions,
                  clicks: currentCampaign.clicks,
                  reach: currentCampaign.reach,
                  ctr: currentCampaign.ctr,
                  cpc: currentCampaign.cpc,
                  cpm: currentCampaign.cpm,
                  uploaded_at: currentCampaign.uploaded_at,
                };
                
                // Verificar si es fila de género
                if (row['Género'] && row['Género'].trim() !== '') {
                  rows.push({
                    ...baseRow,
                    gender: row['Género'],
                    gender_impressions: parseInt(row['Impresiones (Género)']) || 0,
                    gender_clicks: parseInt(row['Clicks (Género)']) || 0,
                    gender_spend: parseFloat(row['Gasto (Género)']) || 0,
                  });
                }
                
                // Verificar si es fila de país
                if (row['País'] && row['País'].trim() !== '') {
                  rows.push({
                    ...baseRow,
                    country: row['País'],
                    country_impressions: parseInt(row['Impresiones (País)']) || 0,
                    country_clicks: parseInt(row['Clicks (País)']) || 0,
                    country_spend: parseFloat(row['Gasto (País)']) || 0,
                  });
                }
                
                // Verificar si es fila de región
                if (row['Región'] && row['Región'].trim() !== '') {
                  rows.push({
                    ...baseRow,
                    region: row['Región'],
                    region_country: row['País (Región)'],
                    region_impressions: parseInt(row['Impresiones (Región)']) || 0,
                    region_clicks: parseInt(row['Clicks (Región)']) || 0,
                    region_spend: parseFloat(row['Gasto (Región)']) || 0,
                  });
                }
              }
            })
            .on('end', resolve)
            .on('error', reject);
        });
        
        if (rows.length > 0) {
          console.log(`FacebookTokenManager: Procesadas ${rows.length} fila(s) (campaña + demografía)...`);
          
          // Insertar directamente a BigQuery usando el método del uploader
          await uploader.uploadRawRows(rows);
          
          successCount++;
          console.log(`FacebookTokenManager: ✓ ${file} subido exitosamente\n`);
        } else {
          console.log(`FacebookTokenManager: ⚠ ${file} no contiene datos válidos\n`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`FacebookTokenManager: ✗ Error subiendo ${file}:`, error.message);
        console.error('Continuando con el siguiente archivo...\n');
      }
    }

    console.log('='.repeat(150));
    console.log(`FacebookTokenManager: Proceso completado`);
    console.log(`  ✓ Archivos subidos exitosamente: ${successCount}`);
    console.log(`  ✗ Archivos con error: ${errorCount}`);
    console.log('='.repeat(150));

  } catch (error: any) {
    console.error('FacebookTokenManager: ❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar
uploadAllCSVs().catch((error) => {
  console.error('FacebookTokenManager: Error fatal durante la subida:', error);
  process.exit(1);
});

