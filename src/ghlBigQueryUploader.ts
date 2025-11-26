import { BigQuery } from '@google-cloud/bigquery';
import { GHLAppointmentMetrics } from './types';

export class GHLBigQueryUploader {
  private bigquery: BigQuery;
  private datasetId: string;
  private tableId: string;

  constructor(
    projectId: string,
    datasetId: string,
    tableId: string = 'ghl_appointments',
    keyFilename?: string
  ) {
    this.bigquery = new BigQuery({
      projectId,
      keyFilename,
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

    try {
      const [exists] = await table.exists();
      
      if (!exists) {
        console.log(`GHL BigQuery: Creando tabla ${this.tableId}...`);
        
        const schema = [
          { name: 'date', type: 'DATE', mode: 'REQUIRED' },
          { name: 'location_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'location_name', type: 'STRING', mode: 'NULLABLE' },
          { name: 'total_scheduled', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'scheduled_paid', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'showed', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'closed', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'scheduled_confirmed', type: 'INTEGER', mode: 'NULLABLE' },
          { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        ];

        await table.create({ schema });
        console.log(`GHL BigQuery: Tabla ${this.tableId} creada exitosamente`);
      } else {
        console.log(`GHL BigQuery: Tabla ${this.tableId} ya existe`);
      }
    } catch (error: any) {
      console.error('GHL BigQuery: Error creando tabla:', error.message);
      throw error;
    }
  }

  /**
   * Sube métricas de appointments a BigQuery
   */
  async uploadMetrics(metrics: GHLAppointmentMetrics): Promise<void> {
    try {
      console.log(`GHL BigQuery: Subiendo métricas para ${metrics.locationName}...`);
      
      await this.createTableIfNotExists();

      const dataset = this.bigquery.dataset(this.datasetId);
      const table = dataset.table(this.tableId);

      const row = {
        date: metrics.date,
        location_id: metrics.locationId,
        location_name: metrics.locationName,
        total_scheduled: metrics.totalScheduled,
        scheduled_paid: metrics.scheduledPaid,
        showed: metrics.showed,
        closed: metrics.closed,
        scheduled_confirmed: metrics.scheduledConfirmed,
        uploaded_at: new Date().toISOString(),
      };

      await table.insert([row]);
      
      console.log(`GHL BigQuery: Métricas subidas exitosamente`);
      console.log(`  - Date: ${row.date}`);
      console.log(`  - Location: ${row.location_name}`);
      console.log(`  - Total Scheduled: ${row.total_scheduled}`);
    } catch (error: any) {
      console.error('GHL BigQuery: Error subiendo métricas:', error.message);
      if (error.errors) {
        console.error('GHL BigQuery: Detalles de errores:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  /**
   * Sube múltiples métricas en batch
   */
  async uploadMetricsBatch(metricsList: GHLAppointmentMetrics[]): Promise<void> {
    try {
      console.log(`GHL BigQuery: Subiendo ${metricsList.length} métricas en batch...`);
      
      await this.createTableIfNotExists();

      const dataset = this.bigquery.dataset(this.datasetId);
      const table = dataset.table(this.tableId);

      const rows = metricsList.map(metrics => ({
        date: metrics.date,
        location_id: metrics.locationId,
        location_name: metrics.locationName,
        total_scheduled: metrics.totalScheduled,
        scheduled_paid: metrics.scheduledPaid,
        showed: metrics.showed,
        closed: metrics.closed,
        scheduled_confirmed: metrics.scheduledConfirmed,
        uploaded_at: new Date().toISOString(),
      }));

      await table.insert(rows);
      
      console.log(`GHL BigQuery: ${metricsList.length} métricas subidas exitosamente`);
    } catch (error: any) {
      console.error('GHL BigQuery: Error subiendo métricas en batch:', error.message);
      if (error.errors) {
        console.error('GHL BigQuery: Detalles de errores:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  /**
   * Verifica la conexión a BigQuery
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('GHL BigQuery: Verificando conexión...');
      const [datasets] = await this.bigquery.getDatasets();
      console.log(`GHL BigQuery: Conexión exitosa. Datasets disponibles: ${datasets.length}`);
      return true;
    } catch (error: any) {
      console.error('GHL BigQuery: Error de conexión:', error.message);
      return false;
    }
  }
}

/**
 * Factory function para crear un uploader de GHL
 */
export function createGHLBigQueryUploader(
  projectId: string,
  datasetId: string,
  tableId: string = 'ghl_appointments',
  keyFilename?: string
): GHLBigQueryUploader {
  return new GHLBigQueryUploader(projectId, datasetId, tableId, keyFilename);
}

