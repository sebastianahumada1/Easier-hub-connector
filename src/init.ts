import * as dotenv from 'dotenv';
import { tokenManager } from './tokenManager';
import { storage } from './storage';
import { FacebookApp } from './types';

dotenv.config();

/**
 * Script de inicialización: Convierte los tokens actuales a tokens de larga duración
 */
async function initialize() {
  console.log('FacebookTokenManager: Iniciando proceso de inicialización...\n');

  const apps: FacebookApp[] = [];

  // Cargar apps desde variables de entorno
  if (process.env.APP1_ID && process.env.APP1_SECRET && process.env.APP1_TOKEN) {
    apps.push({
      id: process.env.APP1_ID,
      secret: process.env.APP1_SECRET,
      token: process.env.APP1_TOKEN,
    });
  }

  if (process.env.APP2_ID && process.env.APP2_SECRET && process.env.APP2_TOKEN) {
    apps.push({
      id: process.env.APP2_ID,
      secret: process.env.APP2_SECRET,
      token: process.env.APP2_TOKEN,
    });
  }

  if (apps.length === 0) {
    console.error('FacebookTokenManager: No se encontraron apps configuradas en el archivo .env');
    console.error('FacebookTokenManager: Asegúrate de tener las variables APP1_ID, APP1_SECRET, APP1_TOKEN, etc.');
    process.exit(1);
  }

  console.log(`FacebookTokenManager: Se encontraron ${apps.length} app(s) configurada(s)\n`);

  // Procesar cada app
  for (const app of apps) {
    try {
      console.log(`FacebookTokenManager: Procesando App ID: ${app.id}`);
      console.log(`FacebookTokenManager: Convirtiendo token a larga duración...`);

      // Intercambiar por token de larga duración
      const longLivedToken = await tokenManager.exchangeForLongLivedToken(app);

      // Obtener información del nuevo token
      const tokenInfo = await tokenManager.getTokenInfo(longLivedToken);

      // Calcular días hasta expiración
      const daysUntilExpiration = tokenManager.getDaysUntilExpiration(tokenInfo.expires_at);

      // Guardar token
      storage.saveToken({
        appId: app.id,
        token: longLivedToken,
        expiresAt: tokenInfo.expires_at,
        lastUpdated: new Date().toISOString(),
      });

      console.log(`FacebookTokenManager: ✓ Token guardado exitosamente`);
      console.log(`FacebookTokenManager: ✓ Expira en ${daysUntilExpiration} días`);
      console.log(`FacebookTokenManager: ✓ Fecha de expiración: ${new Date(tokenInfo.expires_at * 1000).toLocaleString()}\n`);
    } catch (error: any) {
      console.error(`FacebookTokenManager: ✗ Error procesando app ${app.id}:`, error.message);
      console.error('FacebookTokenManager: Continuando con la siguiente app...\n');
    }
  }

  console.log('FacebookTokenManager: Proceso de inicialización completado');
  console.log('FacebookTokenManager: Puedes ejecutar "npm start" para iniciar el sistema de auto-renovación');
}

// Ejecutar
initialize().catch((error) => {
  console.error('FacebookTokenManager: Error fatal durante la inicialización:', error);
  process.exit(1);
});

