import * as dotenv from 'dotenv';
import { BigQueryUploader } from './bigquery-uploader';

dotenv.config();

/**
 * Script para recrear la tabla de BigQuery con el nuevo schema
 */
async function recreateTable() {
  console.log('='.repeat(100));
  console.log('FacebookTokenManager: Recrear Tabla en BigQuery con Nuevo Schema');
  console.log('='.repeat(100));
  console.log();

  if (!process.env.BIGQUERY_PROJECT_ID || !process.env.BIGQUERY_DATASET_ID || !process.env.BIGQUERY_TABLE_ID) {
    console.error('❌ Error: Faltan variables de entorno de BigQuery');
    process.exit(1);
  }

  try {
    const uploader = new BigQueryUploader(
      process.env.BIGQUERY_PROJECT_ID,
      process.env.BIGQUERY_DATASET_ID,
      process.env.BIGQUERY_TABLE_ID,
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

    console.log('FacebookTokenManager: Verificando si la tabla existe...');
    
    const dataset = uploader['bigquery'].dataset(process.env.BIGQUERY_DATASET_ID);
    const table = dataset.table(process.env.BIGQUERY_TABLE_ID);

    const [exists] = await table.exists();
    
    if (exists) {
      console.log('FacebookTokenManager: Tabla encontrada, eliminando...');
      await table.delete();
      console.log('FacebookTokenManager: ✓ Tabla eliminada');
    } else {
      console.log('FacebookTokenManager: La tabla no existe');
    }

    console.log('\nFacebookTokenManager: Creando tabla con nuevo schema (incluye row_id)...');
    await uploader.createTableIfNotExists();
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ Tabla recreada exitosamente con el nuevo schema');
    console.log('='.repeat(100));
    console.log('\nAhora puedes ejecutar: npm run upload-bq');
    console.log('Para subir tus datos con el campo row_id\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateTable();

