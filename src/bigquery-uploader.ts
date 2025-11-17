import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';
import { CampaignReport } from './reports';

export interface CampaignReportSimplified {
  campaignId: string;
  campaignName: string;
  accountName: string;
  accountId: string;
  status: string;
  dateStart: string;
  dateEnd: string;
  spend: number;
  leads: number;
  costPerLead: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export class BigQueryUploader {
  private bigquery: BigQuery;
  private datasetId: string;
  private tableId: string;

  constructor(
    projectId: string,
    datasetId: string,
    tableId: string,
    keyFilename?: string
  ) {
    this.bigquery = new BigQuery({
      projectId,
      keyFilename, // Ruta al archivo JSON de credenciales
    });
    this.datasetId = datasetId;
    this.tableId = tableId;
  }

  /**
   * Crea la tabla si no existe con el schema correcto
   */
  async createTableIfNotExists(): Promise<void> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.tableId);

    const [exists] = await table.exists();
    
    if (!exists) {
      console.log('FacebookTokenManager: Creando tabla en BigQuery...');
      
      const schema = [
        { name: 'row_id', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'app_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'campaign_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'campaign_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'account_name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'account_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'status', type: 'STRING', mode: 'NULLABLE' },
        { name: 'date_start', type: 'DATE', mode: 'NULLABLE' },
        { name: 'date_end', type: 'DATE', mode: 'NULLABLE' },
        { name: 'month', type: 'STRING', mode: 'NULLABLE' },
        { name: 'spend', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'leads', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'cost_per_lead', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'impressions', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'clicks', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'reach', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'ctr', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'cpc', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'cpm', type: 'FLOAT', mode: 'NULLABLE' },
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

      await dataset.createTable(this.tableId, { schema });
      console.log('FacebookTokenManager: Tabla creada exitosamente en BigQuery');
    } else {
      console.log('FacebookTokenManager: Tabla ya existe en BigQuery');
    }
  }

  /**
   * Sube un archivo CSV a BigQuery
   */
  async uploadCSV(csvFilePath: string): Promise<void> {
    console.log(`FacebookTokenManager: Subiendo ${path.basename(csvFilePath)} a BigQuery...`);

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.tableId);

    // Configuración para el load job
    const metadata = {
      sourceFormat: 'CSV',
      skipLeadingRows: 1, // Skip header
      autodetect: false,
      writeDisposition: 'WRITE_APPEND', // Agregar datos, no sobrescribir
      allowJaggedRows: true, // Permitir filas con diferente número de columnas
      allowQuotedNewlines: true,
    };

    try {
      // Cargar el archivo - load() ya espera a que complete
      await table.load(csvFilePath, metadata);
      
      console.log('FacebookTokenManager: ✓ Datos cargados exitosamente a BigQuery');
    } catch (error: any) {
      console.error('FacebookTokenManager: Error cargando CSV a BigQuery:', error.message);
      if (error.errors) {
        console.error('Detalles:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  /**
   * Sube datos directamente desde objetos (más eficiente que CSV)
   */
  async uploadFromReports(reports: CampaignReport[]): Promise<void> {
    console.log('FacebookTokenManager: Subiendo reportes directamente a BigQuery...');

    const rows: any[] = [];
    let rowId = 1; // Contador para agrupar fila principal con sub-filas

    for (const report of reports) {
      // Extraer el mes en formato YYYY-MM de date_start
      const month = report.dateStart ? report.dateStart.substring(0, 7) : null;
      
      const baseRow = {
        row_id: rowId,
        app_id: (report as any).appId || null,
        campaign_id: report.campaignId,
        campaign_name: report.campaignName,
        account_name: report.accountName,
        account_id: report.accountId,
        status: report.status,
        date_start: report.dateStart,
        date_end: report.dateEnd,
        month: month,
        uploaded_at: new Date().toISOString(),
      };

      // Fila principal con métricas generales (solo esta tiene los totales)
      rows.push({
        ...baseRow,
        spend: report.spend,
        leads: report.leads,
        cost_per_lead: report.costPerLead,
        impressions: report.impressions,
        clicks: report.clicks,
        reach: report.reach,
        ctr: report.ctr,
        cpc: report.cpc,
        cpm: report.cpm,
      });

      // Filas por género (mismo row_id, SIN métricas totales para evitar duplicación)
      for (const gender of report.demographics.byGender) {
        rows.push({
          ...baseRow,
          gender: gender.gender,
          gender_impressions: gender.impressions,
          gender_clicks: gender.clicks,
          gender_spend: gender.spend,
        });
      }

      // Filas por país (mismo row_id, SIN métricas totales)
      for (const country of report.demographics.byCountry) {
        rows.push({
          ...baseRow,
          country: country.country,
          country_impressions: country.impressions,
          country_clicks: country.clicks,
          country_spend: country.spend,
        });
      }

      // Filas por región (mismo row_id, SIN métricas totales)
      for (const region of report.demographics.byRegion) {
        rows.push({
          ...baseRow,
          region: region.region,
          region_country: region.country,
          region_impressions: region.impressions,
          region_clicks: region.clicks,
          region_spend: region.spend,
        });
      }

      // Filas por edad (mismo row_id, SIN métricas totales)
      for (const age of report.demographics.byAge) {
        rows.push({
          ...baseRow,
          age: age.age,
          age_impressions: age.impressions,
          age_clicks: age.clicks,
          age_spend: age.spend,
        });
      }

      rowId++; // Incrementar para la siguiente campaña
    }

    try {
      const table = this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId);
      
      await table.insert(rows, { raw: false });
      console.log(`FacebookTokenManager: ✓ ${rows.length} filas insertadas en BigQuery`);
    } catch (error: any) {
      console.error('FacebookTokenManager: Error insertando datos en BigQuery:', error.message);
      if (error.errors) {
        console.error('Errores por fila:', JSON.stringify(error.errors.slice(0, 3), null, 2));
      }
      throw error;
    }
  }

  /**
   * Sube datos simplificados (solo métricas principales, sin demografía)
   */
  async uploadSimplifiedReports(reports: CampaignReportSimplified[]): Promise<void> {
    console.log('FacebookTokenManager: Subiendo reportes simplificados a BigQuery...');

    const rows = reports.map(report => ({
      campaign_id: report.campaignId,
      campaign_name: report.campaignName,
      account_name: report.accountName,
      account_id: report.accountId,
      status: report.status,
      date_start: report.dateStart,
      date_end: report.dateEnd,
      spend: report.spend,
      leads: report.leads,
      cost_per_lead: report.costPerLead,
      impressions: report.impressions,
      clicks: report.clicks,
      reach: report.reach,
      ctr: report.ctr,
      cpc: report.cpc,
      cpm: report.cpm,
      uploaded_at: new Date().toISOString(),
    }));

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.tableId);

    try {
      await table.insert(rows);
      console.log(`FacebookTokenManager: ✓ ${rows.length} campaña(s) insertadas en BigQuery`);
    } catch (error: any) {
      console.error('FacebookTokenManager: Error insertando datos en BigQuery:', error.message);
      if (error.errors) {
        console.error('Errores por fila:', JSON.stringify(error.errors.slice(0, 5), null, 2));
      }
      throw error;
    }
  }

  /**
   * Sube filas raw directamente a BigQuery (para datos con demografía)
   */
  async uploadRawRows(rows: any[]): Promise<void> {
    console.log('FacebookTokenManager: Subiendo datos a BigQuery...');

    try {
      // Usar insertAll en lugar de insert para mejor control
      await this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId)
        .insert(rows, { raw: true });
      
      console.log(`FacebookTokenManager: ✓ ${rows.length} fila(s) insertadas en BigQuery`);
    } catch (error: any) {
      console.error('FacebookTokenManager: Error insertando datos en BigQuery:', error.message);
      if (error.errors) {
        console.error('Errores por fila:', JSON.stringify(error.errors.slice(0, 5), null, 2));
      }
      throw error;
    }
  }

  /**
   * Verifica la conexión a BigQuery
   */
  async testConnection(): Promise<boolean> {
    try {
      const dataset = this.bigquery.dataset(this.datasetId);
      const [exists] = await dataset.exists();
      
      if (!exists) {
        console.log('FacebookTokenManager: Dataset no existe, creándolo...');
        await dataset.create();
        console.log('FacebookTokenManager: Dataset creado exitosamente');
      }
      
      console.log('FacebookTokenManager: ✓ Conexión a BigQuery exitosa');
      return true;
    } catch (error: any) {
      console.error('FacebookTokenManager: ✗ Error conectando a BigQuery:', error.message);
      return false;
    }
  }
}

