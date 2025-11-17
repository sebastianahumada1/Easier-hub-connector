import * as dotenv from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';

dotenv.config();

/**
 * Script para dividir campaign_reports en dos tablas:
 * 1. campaign_metrics: Métricas principales de campaña
 * 2. campaign_demographics: Desglose demográfico
 */
async function splitTables() {
  console.log('='.repeat(150));
  console.log('FacebookTokenManager: Dividir tabla campaign_reports en dos tablas');
  console.log('='.repeat(150));
  console.log();

  if (!process.env.BIGQUERY_PROJECT_ID || !process.env.BIGQUERY_DATASET_ID) {
    console.error('❌ Error: Faltan variables de entorno de BigQuery');
    process.exit(1);
  }

  const projectId = process.env.BIGQUERY_PROJECT_ID;
  const datasetId = process.env.BIGQUERY_DATASET_ID;

  const bigquery = new BigQuery({
    projectId,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  const dataset = bigquery.dataset(datasetId);

  try {
    // ========================================
    // 1. CREAR TABLA: campaign_metrics
    // ========================================
    console.log('FacebookTokenManager: Creando tabla campaign_metrics...');
    
    const metricsTable = dataset.table('campaign_metrics');
    const [metricsExists] = await metricsTable.exists();
    
    if (metricsExists) {
      console.log('FacebookTokenManager: Eliminando tabla existente campaign_metrics...');
      await metricsTable.delete();
    }

    const metricsSchema = [
      { name: 'row_id', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'app_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'campaign_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'campaign_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'account_name', type: 'STRING', mode: 'NULLABLE' },
      { name: 'account_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'status', type: 'STRING', mode: 'NULLABLE' },
      { name: 'date_start', type: 'DATE', mode: 'NULLABLE' },
      { name: 'date_end', type: 'DATE', mode: 'NULLABLE' },
      { name: 'spend', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'leads', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'cost_per_lead', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'impressions', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'clicks', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'reach', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'ctr', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'cpc', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'cpm', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
    ];

    await dataset.createTable('campaign_metrics', { schema: metricsSchema });
    console.log('FacebookTokenManager: ✓ Tabla campaign_metrics creada\n');

    // ========================================
    // 2. CREAR TABLA: campaign_demographics
    // ========================================
    console.log('FacebookTokenManager: Creando tabla campaign_demographics...');
    
    const demographicsTable = dataset.table('campaign_demographics');
    const [demographicsExists] = await demographicsTable.exists();
    
    if (demographicsExists) {
      console.log('FacebookTokenManager: Eliminando tabla existente campaign_demographics...');
      await demographicsTable.delete();
    }

    const demographicsSchema = [
      { name: 'row_id', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'app_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'campaign_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'campaign_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'account_name', type: 'STRING', mode: 'NULLABLE' },
      { name: 'account_id', type: 'STRING', mode: 'NULLABLE' },
      { name: 'status', type: 'STRING', mode: 'NULLABLE' },
      { name: 'date_start', type: 'DATE', mode: 'NULLABLE' },
      { name: 'date_end', type: 'DATE', mode: 'NULLABLE' },
      { name: 'gender', type: 'STRING', mode: 'NULLABLE' },
      { name: 'gender_impressions', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'gender_clicks', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'gender_spend', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'country', type: 'STRING', mode: 'NULLABLE' },
      { name: 'country_impressions', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'country_clicks', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'country_spend', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'region', type: 'STRING', mode: 'NULLABLE' },
      { name: 'region_country', type: 'STRING', mode: 'NULLABLE' },
      { name: 'region_impressions', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'region_clicks', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'region_spend', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'age', type: 'STRING', mode: 'NULLABLE' },
      { name: 'age_impressions', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'age_clicks', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'age_spend', type: 'FLOAT', mode: 'NULLABLE' },
      { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
    ];

    await dataset.createTable('campaign_demographics', { schema: demographicsSchema });
    console.log('FacebookTokenManager: ✓ Tabla campaign_demographics creada\n');

    // ========================================
    // 3. POBLAR campaign_metrics
    // ========================================
    console.log('FacebookTokenManager: Poblando campaign_metrics con datos...');
    
    const metricsQuery = `
      INSERT INTO \`${projectId}.${datasetId}.campaign_metrics\`
      (row_id, app_id, campaign_id, campaign_name, account_name, account_id, status, 
       date_start, date_end, spend, leads, cost_per_lead, impressions, clicks, 
       reach, ctr, cpc, cpm, uploaded_at)
      SELECT DISTINCT
        row_id,
        app_id,
        campaign_id,
        campaign_name,
        account_name,
        account_id,
        status,
        date_start,
        date_end,
        spend,
        leads,
        cost_per_lead,
        impressions,
        clicks,
        reach,
        ctr,
        cpc,
        cpm,
        uploaded_at
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY row_id ORDER BY uploaded_at DESC) as rn
        FROM \`${projectId}.${datasetId}.campaign_reports\`
        WHERE gender IS NULL 
          AND country IS NULL 
          AND region IS NULL
      )
      WHERE rn = 1
    `;

    const [metricsJob] = await bigquery.createQueryJob({ query: metricsQuery });
    await metricsJob.getQueryResults();
    
    console.log('FacebookTokenManager: ✓ Datos insertados en campaign_metrics\n');

    // ========================================
    // 4. POBLAR campaign_demographics
    // ========================================
    console.log('FacebookTokenManager: Poblando campaign_demographics con datos...');
    
    const demographicsQuery = `
      INSERT INTO \`${projectId}.${datasetId}.campaign_demographics\`
      (row_id, app_id, campaign_id, campaign_name, account_name, account_id, status, 
       date_start, date_end, gender, gender_impressions, gender_clicks, gender_spend,
       country, country_impressions, country_clicks, country_spend,
       region, region_country, region_impressions, region_clicks, region_spend,
       age, age_impressions, age_clicks, age_spend, uploaded_at)
      SELECT DISTINCT
        row_id,
        app_id,
        campaign_id,
        campaign_name,
        account_name,
        account_id,
        status,
        date_start,
        date_end,
        gender,
        gender_impressions,
        gender_clicks,
        gender_spend,
        country,
        country_impressions,
        country_clicks,
        country_spend,
        region,
        region_country,
        region_impressions,
        region_clicks,
        region_spend,
        age,
        age_impressions,
        age_clicks,
        age_spend,
        uploaded_at
      FROM (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY row_id, 
                         COALESCE(gender, ''), 
                         COALESCE(country, ''), 
                         COALESCE(region, ''),
                         COALESCE(age, '')
            ORDER BY uploaded_at DESC
          ) as rn
        FROM \`${projectId}.${datasetId}.campaign_reports\`
        WHERE gender IS NOT NULL 
          OR country IS NOT NULL 
          OR region IS NOT NULL
          OR age IS NOT NULL
      )
      WHERE rn = 1
    `;

    const [demographicsJob] = await bigquery.createQueryJob({ query: demographicsQuery });
    await demographicsJob.getQueryResults();
    
    console.log('FacebookTokenManager: ✓ Datos insertados en campaign_demographics\n');

    // ========================================
    // 5. VERIFICAR RESULTADOS
    // ========================================
    console.log('FacebookTokenManager: Verificando resultados...\n');

    const countMetricsQuery = `SELECT COUNT(*) as total FROM \`${projectId}.${datasetId}.campaign_metrics\``;
    const [metricsCount] = await bigquery.query({ query: countMetricsQuery });
    console.log(`FacebookTokenManager: campaign_metrics tiene ${metricsCount[0].total} fila(s)`);

    const countDemographicsQuery = `SELECT COUNT(*) as total FROM \`${projectId}.${datasetId}.campaign_demographics\``;
    const [demographicsCount] = await bigquery.query({ query: countDemographicsQuery });
    console.log(`FacebookTokenManager: campaign_demographics tiene ${demographicsCount[0].total} fila(s)\n`);

    // ========================================
    // RESUMEN
    // ========================================
    console.log('='.repeat(150));
    console.log('✅ Tablas creadas y pobladas exitosamente');
    console.log('='.repeat(150));
    console.log();
    console.log('📊 Tablas disponibles:');
    console.log(`   1. ${datasetId}.campaign_metrics - Métricas principales (${metricsCount[0].total} campañas)`);
    console.log(`   2. ${datasetId}.campaign_demographics - Desglose demográfico (${demographicsCount[0].total} filas)`);
    console.log();
    console.log('💡 Consultas de ejemplo:');
    console.log();
    console.log('   -- Ver todas las campañas con sus métricas:');
    console.log(`   SELECT * FROM \`${projectId}.${datasetId}.campaign_metrics\` ORDER BY spend DESC LIMIT 10;`);
    console.log();
    console.log('   -- Ver desglose demográfico de una campaña específica:');
    console.log(`   SELECT * FROM \`${projectId}.${datasetId}.campaign_demographics\` WHERE row_id = 1;`);
    console.log();
    console.log('   -- Unir ambas tablas:');
    console.log(`   SELECT m.*, d.gender, d.gender_spend, d.country, d.region`);
    console.log(`   FROM \`${projectId}.${datasetId}.campaign_metrics\` m`);
    console.log(`   LEFT JOIN \`${projectId}.${datasetId}.campaign_demographics\` d`);
    console.log(`   ON m.row_id = d.row_id;`);
    console.log();

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

splitTables();

