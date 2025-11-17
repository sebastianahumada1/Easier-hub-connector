import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { tokenManager } from './tokenManager';
import { storage } from './storage';
import { FacebookApp } from './types';

dotenv.config();

export class TokenScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Obtiene las apps configuradas desde variables de entorno
   */
  private getApps(): FacebookApp[] {
    const apps: FacebookApp[] = [];

    if (process.env.APP1_ID && process.env.APP1_SECRET) {
      apps.push({
        id: process.env.APP1_ID,
        secret: process.env.APP1_SECRET,
        token: '', // No necesitamos el token aquí, se obtiene del storage
      });
    }

    if (process.env.APP2_ID && process.env.APP2_SECRET) {
      apps.push({
        id: process.env.APP2_ID,
        secret: process.env.APP2_SECRET,
        token: '',
      });
    }

    return apps;
  }

  /**
   * Verifica y renueva tokens si es necesario
   */
  async checkAndRenewTokens(): Promise<void> {
    console.log('FacebookTokenManager: Iniciando verificación de tokens...');
    
    const apps = this.getApps();
    const allTokens = storage.getAllTokens();

    for (const app of apps) {
      try {
        const tokenData = allTokens.find(t => t.appId === app.id);

        if (!tokenData) {
          console.log(`FacebookTokenManager: No se encontró token almacenado para app ${app.id}`);
          continue;
        }

        const daysRemaining = tokenManager.getDaysUntilExpiration(tokenData.expiresAt);
        console.log(`FacebookTokenManager: App ${app.id} - Token expira en ${daysRemaining} días`);

        if (tokenManager.needsRenewal(tokenData.expiresAt)) {
          console.log(`FacebookTokenManager: Renovando token para app ${app.id}...`);
          
          // Usar el token actual para renovar
          const appWithToken: FacebookApp = {
            ...app,
            token: tokenData.token,
          };

          const newToken = await tokenManager.exchangeForLongLivedToken(appWithToken);
          const tokenInfo = await tokenManager.getTokenInfo(newToken);

          storage.saveToken({
            appId: app.id,
            token: newToken,
            expiresAt: tokenInfo.expires_at,
            lastUpdated: new Date().toISOString(),
          });

          console.log(`FacebookTokenManager: Token renovado exitosamente para app ${app.id}`);
        } else {
          console.log(`FacebookTokenManager: Token de app ${app.id} no necesita renovación todavía`);
        }
      } catch (error: any) {
        console.error(`FacebookTokenManager: Error procesando app ${app.id}:`, error.message);
      }
    }

    console.log('FacebookTokenManager: Verificación completada\n');
  }

  /**
   * Inicia el scheduler que ejecuta la verificación diariamente
   */
  start(): void {
    console.log('FacebookTokenManager: Iniciando scheduler de auto-renovación...');
    console.log('FacebookTokenManager: El scheduler se ejecutará diariamente a las 2:00 AM');

    // Ejecutar inmediatamente al iniciar
    this.checkAndRenewTokens();

    // Programar para ejecutar diariamente a las 2:00 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      await this.checkAndRenewTokens();
    });

    console.log('FacebookTokenManager: Scheduler iniciado correctamente\n');
  }

  /**
   * Detiene el scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('FacebookTokenManager: Scheduler detenido');
    }
  }
}

export const scheduler = new TokenScheduler();

