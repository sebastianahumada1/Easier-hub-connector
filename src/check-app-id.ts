import * as dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config();

async function checkAppId() {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  console.log('Verificando campo app_id...\n');

  // Verificar campaign_metrics
  const metricsQuery = `
    SELECT app_id, COUNT(*) as count
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_metrics\`
    GROUP BY app_id
    ORDER BY app_id
  `;
  
  const [metricsRows] = await bigquery.query({ query: metricsQuery });
  console.log('campaign_metrics - Campañas por App:');
  console.log(metricsRows);
  console.log();
  
  // Verificar campaign_demographics
  const demoQuery = `
    SELECT app_id, COUNT(*) as count
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_demographics\`
    GROUP BY app_id
    ORDER BY app_id
  `;
  
  const [demoRows] = await bigquery.query({ query: demoQuery });
  console.log('campaign_demographics - Filas por App:');
  console.log(demoRows);
  console.log();
  
  // Muestra de datos con app_id
  const sampleQuery = `
    SELECT app_id, campaign_id, campaign_name, account_name
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_metrics\`
    LIMIT 5
  `;
  
  const [sampleRows] = await bigquery.query({ query: sampleQuery });
  console.log('Muestra de campaign_metrics:');
  console.log(sampleRows);
}

checkAppId();

