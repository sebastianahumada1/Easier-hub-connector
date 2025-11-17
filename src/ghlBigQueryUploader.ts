import { BigQuery } from '@google-cloud/bigquery';
import { GHLAppointmentMetrics, GHLFunnelMetrics } from './types';

/**
 * Uploader para subir datos de GHL a BigQuery
 */
export class GHLBigQueryUploader {
  private bigquery: BigQuery;
  private datasetId: string;
  private appointmentsTableId: string;
  private funnelsTableId: string;

  constructor(
    projectId: string,
    datasetId: string,
    keyFilename?: string
  ) {
    this.bigquery = new BigQuery({
      projectId,
      keyFilename,
    });
    this.datasetId = datasetId;
    this.appointmentsTableId = 'ghl_appointments';
    this.funnelsTableId = 'ghl_funnels';
  }

  /**
   * Verifica la conexión a BigQuery
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.bigquery.getDatasets();
      console.log('GHL BigQuery: Conexión exitosa');
      return true;
    } catch (error: any) {
      console.error('GHL BigQuery: Error de conexión:', error.message);
      return false;
    }
  }

  /**
   * Crea la tabla de appointments si no existe
   */
  async createAppointmentsTable(): Promise<void> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.appointmentsTableId);

    const [exists] = await table.exists();
    
    if (!exists) {
      console.log('GHL BigQuery: Creando tabla ghl_appointments...');
      
      const schema = [
        { name: 'account_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'account_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'date', type: 'DATE', mode: 'REQUIRED' },
        { name: 'total_scheduled', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'scheduled_paid', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'showed', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'closed', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'scheduled_confirmed', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ];

      await dataset.createTable(this.appointmentsTableId, { schema });
      console.log('GHL BigQuery: Tabla ghl_appointments creada exitosamente');
    } else {
      console.log('GHL BigQuery: Tabla ghl_appointments ya existe');
    }
  }

  /**
   * Crea la tabla de funnels si no existe
   */
  async createFunnelsTable(): Promise<void> {
    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.funnelsTableId);

    const [exists] = await table.exists();
    
    if (!exists) {
      console.log('GHL BigQuery: Creando tabla ghl_funnels...');
      
      const schema = [
        { name: 'account_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'account_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'date', type: 'DATE', mode: 'REQUIRED' },
        { name: 'funnel_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'opt_in_rate', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'unique_views', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'opt_ins', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'uploaded_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ];

      await dataset.createTable(this.funnelsTableId, { schema });
      console.log('GHL BigQuery: Tabla ghl_funnels creada exitosamente');
    } else {
      console.log('GHL BigQuery: Tabla ghl_funnels ya existe');
    }
  }

  /**
   * Crea ambas tablas si no existen
   */
  async createTablesIfNotExist(): Promise<void> {
    await this.createAppointmentsTable();
    await this.createFunnelsTable();
  }

  /**
   * Sube datos de appointments a BigQuery
   */
  async uploadAppointments(data: GHLAppointmentMetrics[]): Promise<void> {
    if (data.length === 0) {
      console.log('GHL BigQuery: No hay datos de appointments para subir');
      return;
    }

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.appointmentsTableId);

    const rows = data.map(item => ({
      account_id: item.accountId,
      account_name: item.accountName,
      date: item.date,
      total_scheduled: item.totalScheduled,
      scheduled_paid: item.scheduledPaid,
      showed: item.showed,
      closed: item.closed,
      scheduled_confirmed: item.scheduledConfirmed,
      uploaded_at: new Date().toISOString(),
    }));

    try {
      await table.insert(rows);
      console.log(`GHL BigQuery: ${rows.length} fila(s) de appointments subidas exitosamente`);
    } catch (error: any) {
      console.error('GHL BigQuery: Error subiendo appointments:', error.message);
      if (error.errors && error.errors.length > 0) {
        console.error('Detalles:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }

  /**
   * Sube datos de funnels a BigQuery
   */
  async uploadFunnels(data: GHLFunnelMetrics[]): Promise<void> {
    if (data.length === 0) {
      console.log('GHL BigQuery: No hay datos de funnels para subir');
      return;
    }

    const dataset = this.bigquery.dataset(this.datasetId);
    const table = dataset.table(this.funnelsTableId);

    const rows = data.map(item => ({
      account_id: item.accountId,
      account_name: item.accountName,
      date: item.date,
      funnel_name: item.funnelName,
      opt_in_rate: item.optInRate,
      unique_views: item.uniqueViews,
      opt_ins: item.optIns,
      uploaded_at: new Date().toISOString(),
    }));

    try {
      await table.insert(rows);
      console.log(`GHL BigQuery: ${rows.length} fila(s) de funnels subidas exitosamente`);
    } catch (error: any) {
      console.error('GHL BigQuery: Error subiendo funnels:', error.message);
      if (error.errors && error.errors.length > 0) {
        console.error('Detalles:', JSON.stringify(error.errors, null, 2));
      }
      throw error;
    }
  }
}

