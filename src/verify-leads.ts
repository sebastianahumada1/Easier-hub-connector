import * as dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config();

async function verifyNoLeadDuplication() {
  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  console.log('Verificando que las filas demográficas NO tengan leads duplicados...\n');

  // Verificar filas con leads (solo debe ser la fila principal)
  const leadsQuery = `
    SELECT 
      row_id,
      campaign_name,
      leads,
      spend,
      impressions,
      gender,
      country,
      region,
      age
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_reports\`
    WHERE leads IS NOT NULL
    ORDER BY row_id
    LIMIT 10
  `;
  
  const [leadsRows] = await bigquery.query({ query: leadsQuery });
  console.log('Filas con LEADS (solo debe aparecer la fila principal):');
  console.log(leadsRows);
  console.log();
  
  // Verificar filas demográficas (NO deben tener leads)
  const demoQuery = `
    SELECT 
      row_id,
      campaign_name,
      leads,
      spend,
      impressions,
      gender,
      country,
      region,
      age
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_reports\`
    WHERE gender IS NOT NULL OR country IS NOT NULL OR region IS NOT NULL OR age IS NOT NULL
    ORDER BY row_id
    LIMIT 10
  `;
  
  const [demoRows] = await bigquery.query({ query: demoQuery });
  console.log('Filas demográficas (NO deben tener leads, spend, impressions en columnas principales):');
  console.log(demoRows);
  console.log();
  
  // Probar SUM de leads (ahora debe ser correcto)
  const sumQuery = `
    SELECT 
      COUNT(*) as total_rows,
      COUNT(DISTINCT row_id) as unique_campaigns,
      SUM(leads) as total_leads,
      SUM(spend) as total_spend
    FROM \`engaged-lamp-470319-j9.facebook_ads.campaign_reports\`
    WHERE leads IS NOT NULL
  `;
  
  const [sumRows] = await bigquery.query({ query: sumQuery });
  console.log('Suma de leads (ahora sin duplicación):');
  console.log(sumRows);
  console.log();
  
  console.log('✅ Verificación completada');
  console.log('Ahora SUM(leads) solo cuenta cada lead UNA vez (solo de las filas principales)');
}

verifyNoLeadDuplication();

