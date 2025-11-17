import * as dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config();

async function checkMonthColumn() {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  console.log('Verificando columna month en campaign_reports...\n');

  // Ver muestras con la columna month
  const sampleQuery = `
    SELECT 
      row_id,
      campaign_name,
      date_start,
      month,
      leads,
      spend
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_reports\`
    WHERE leads IS NOT NULL
    ORDER BY date_start
    LIMIT 10
  `;
  
  const [sampleRows] = await bigquery.query({ query: sampleQuery });
  console.log('📅 Muestra de datos con columna month:');
  console.table(sampleRows);
  console.log();
  
  // Agrupar por mes
  const groupByMonthQuery = `
    SELECT 
      month,
      COUNT(DISTINCT row_id) as campaigns,
      SUM(leads) as total_leads,
      ROUND(SUM(spend), 2) as total_spend
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_reports\`
    WHERE leads IS NOT NULL
    GROUP BY month
    ORDER BY month
  `;
  
  const [monthRows] = await bigquery.query({ query: groupByMonthQuery });
  console.log('📊 Resumen por mes:');
  console.table(monthRows);
  console.log();
  
  console.log('✅ Columna month agregada correctamente!');
  console.log('Ahora puedes filtrar por mes fácilmente: WHERE month = "2025-10"');
}

checkMonthColumn();

