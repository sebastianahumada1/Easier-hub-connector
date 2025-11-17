import * as dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config();

async function checkData() {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  console.log('Verificando campaign_metrics...\n');

  // Verificar duplicados en campaign_metrics
  const duplicatesQuery = `
    SELECT row_id, COUNT(*) as count
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_metrics\`
    GROUP BY row_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;
  
  const [duplicates] = await bigquery.query({ query: duplicatesQuery });
  console.log('Filas duplicadas en campaign_metrics (row_id):');
  console.log(duplicates);
  console.log();
  
  const countQuery = 'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_metrics`';
  const [countResult] = await bigquery.query({ query: countQuery });
  console.log('Total de filas en campaign_metrics:', countResult[0].total);
  console.log('Debería ser: 21 campañas únicas\n');

  console.log('Verificando campaign_demographics...\n');

  // Contar por tipo de demografía
  const queries = [
    'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_demographics`',
    'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_demographics` WHERE gender IS NOT NULL',
    'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_demographics` WHERE country IS NOT NULL',
    'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_demographics` WHERE region IS NOT NULL',
    'SELECT COUNT(*) as total FROM `engaged-lamp-470319-j9.facebook_ads.campaign_demographics` WHERE age IS NOT NULL',
  ];

  const labels = ['Total filas', 'Con gender', 'Con country', 'Con region', 'Con age'];

  for (let i = 0; i < queries.length; i++) {
    console.log(`${labels[i]}:`);
    const [rows] = await bigquery.query({ query: queries[i] });
    console.log(rows);
    console.log();
  }
}

checkData();

