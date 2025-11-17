import * as dotenv from 'dotenv';
import { createFacebookClient } from './facebookClient';
import { storage } from './storage';
import { tokenManager } from './tokenManager';
import { InsightsManager } from './insights';
import { CampaignsManager } from './campaigns';

dotenv.config();

/**
 * Script de prueba: Verifica que los tokens funcionan y pueden obtener datos
 */
async function runTests() {
  console.log('='.repeat(70));
  console.log('FacebookTokenManager: Script de Prueba de Conexión');
  console.log('='.repeat(70));
  console.log();

  const allTokens = storage.getAllTokens();

  if (allTokens.length === 0) {
    console.error('FacebookTokenManager: No se encontraron tokens almacenados');
    console.error('FacebookTokenManager: Ejecuta "npm run init" primero');
    process.exit(1);
  }

  console.log(`FacebookTokenManager: Se encontraron ${allTokens.length} token(s) almacenado(s)\n`);

  // Probar cada token
  for (let i = 0; i < allTokens.length; i++) {
    const tokenData = allTokens[i];
    const appNum = i + 1;

    console.log('─'.repeat(70));
    console.log(`FacebookTokenManager: PRUEBA DE APP ${appNum} (ID: ${tokenData.appId})`);
    console.log('─'.repeat(70));

    try {
      // 1. Verificar expiración
      const daysRemaining = tokenManager.getDaysUntilExpiration(tokenData.expiresAt);
      const expirationDate = new Date(tokenData.expiresAt * 1000);
      
      console.log(`\n✓ Token válido hasta: ${expirationDate.toLocaleString()}`);
      console.log(`✓ Días restantes: ${daysRemaining} días`);
      console.log(`✓ Última actualización: ${new Date(tokenData.lastUpdated).toLocaleString()}`);

      // 2. Obtener información del token
      console.log('\nFacebookTokenManager: Obteniendo información del token...');
      const tokenInfo = await tokenManager.getTokenInfo(tokenData.token);
      
      console.log(`✓ Token válido: ${tokenInfo.is_valid ? 'SÍ' : 'NO'}`);
      console.log(`✓ Tipo: ${tokenInfo.type}`);
      console.log(`✓ User ID: ${tokenInfo.user_id}`);
      if (tokenInfo.scopes && tokenInfo.scopes.length > 0) {
        console.log(`✓ Permisos: ${tokenInfo.scopes.join(', ')}`);
      }

      // 3. Crear cliente y hacer pruebas
      const client = createFacebookClient(tokenData.appId);

      // Prueba 1: Obtener información básica del usuario
      console.log('\nFacebookTokenManager: Obteniendo información del usuario...');
      try {
        const userData = await client.get('/me', { 
          fields: 'id,name,email' 
        });
        console.log('✓ Usuario conectado:');
        console.log(`  - ID: ${userData.id}`);
        if (userData.name) console.log(`  - Nombre: ${userData.name}`);
        if (userData.email) console.log(`  - Email: ${userData.email}`);
      } catch (error: any) {
        console.log('⚠ No se pudo obtener información del usuario:', error.response?.data?.error?.message || error.message);
      }

      // Prueba 2: Obtener páginas asociadas
      console.log('\nFacebookTokenManager: Obteniendo páginas de Facebook...');
      try {
        const pagesData = await client.get('/me/accounts', {
          fields: 'id,name,access_token,category'
        });
        
        if (pagesData.data && pagesData.data.length > 0) {
          console.log(`✓ Se encontraron ${pagesData.data.length} página(s):`);
          pagesData.data.forEach((page: any, index: number) => {
            console.log(`  ${index + 1}. ${page.name}`);
            console.log(`     - ID: ${page.id}`);
            console.log(`     - Categoría: ${page.category || 'N/A'}`);
          });
        } else {
          console.log('⚠ No se encontraron páginas asociadas');
        }
      } catch (error: any) {
        console.log('⚠ No se pudo obtener páginas:', error.response?.data?.error?.message || error.message);
      }

      // Prueba 3: Obtener cuentas de Instagram Business (si las hay)
      console.log('\nFacebookTokenManager: Verificando cuentas de Instagram Business...');
      try {
        const igData = await client.get('/me/accounts', {
          fields: 'instagram_business_account{id,username,name,profile_picture_url}'
        });
        
        let foundIG = false;
        if (igData.data && igData.data.length > 0) {
          igData.data.forEach((page: any) => {
            if (page.instagram_business_account) {
              if (!foundIG) {
                console.log('✓ Cuentas de Instagram encontradas:');
                foundIG = true;
              }
              const ig = page.instagram_business_account;
              console.log(`  - @${ig.username || ig.name}`);
              console.log(`    ID: ${ig.id}`);
            }
          });
        }
        
        if (!foundIG) {
          console.log('⚠ No se encontraron cuentas de Instagram Business asociadas');
        }
      } catch (error: any) {
        console.log('⚠ No se pudo verificar Instagram:', error.response?.data?.error?.message || error.message);
      }

      // Prueba 4: Obtener insights de páginas
      console.log('\nFacebookTokenManager: Obteniendo insights de páginas...');
      try {
        const pagesData = await client.get('/me/accounts', {
          fields: 'id,name,access_token'
        });
        
        if (pagesData.data && pagesData.data.length > 0) {
          const insightsManager = new InsightsManager(client);
          
          for (const page of pagesData.data.slice(0, 2)) { // Solo primeras 2 páginas
            console.log(`\n  📊 Insights de página: ${page.name}`);
            try {
              // Métricas comunes de página
              const pageInsights = await insightsManager.getPageInsights(
                page.id,
                page.access_token,
                {
                  metric: ['page_impressions', 'page_engaged_users', 'page_fans'],
                  period: 'day',
                }
              );
              
              if (pageInsights.length > 0) {
                pageInsights.forEach((insight: any) => {
                  const value = insight.values && insight.values.length > 0 
                    ? insight.values[insight.values.length - 1].value 
                    : 'N/A';
                  console.log(`     - ${insight.title}: ${value}`);
                });
              } else {
                console.log('     ⚠ No hay datos de insights disponibles');
              }
            } catch (err: any) {
              console.log(`     ⚠ Error obteniendo insights: ${err.response?.data?.error?.message || err.message}`);
            }
          }
        }
      } catch (error: any) {
        console.log('⚠ No se pudieron obtener insights de páginas:', error.response?.data?.error?.message || error.message);
      }

      // Prueba 5: Obtener campañas publicitarias
      console.log('\nFacebookTokenManager: Obteniendo campañas publicitarias...');
      try {
        const campaignsManager = new CampaignsManager(client);
        
        // Obtener cuentas de anuncios
        const adAccounts = await campaignsManager.getAdAccounts();
        
        if (adAccounts.length > 0) {
          console.log(`✓ Se encontraron ${adAccounts.length} cuenta(s) de anuncios:`);
          
          for (const account of adAccounts.slice(0, 2)) { // Solo primeras 2 cuentas
            console.log(`\n  💼 Cuenta: ${account.name}`);
            console.log(`     - ID: ${account.account_id}`);
            console.log(`     - Estado: ${account.account_status}`);
            console.log(`     - Moneda: ${account.currency}`);
            if (account.amount_spent) {
              console.log(`     - Gastado: ${parseFloat(account.amount_spent) / 100} ${account.currency}`);
            }
            
            try {
              // Obtener campañas de esta cuenta
              const campaigns = await campaignsManager.getCampaigns(account.id);
              
              if (campaigns.length > 0) {
                console.log(`\n     📢 Campañas activas/recientes (${campaigns.length}):`);
                
                for (const campaign of campaigns.slice(0, 3)) { // Solo primeras 3 campañas
                  console.log(`\n        • ${campaign.name}`);
                  console.log(`          - ID: ${campaign.id}`);
                  console.log(`          - Estado: ${campaign.status}`);
                  console.log(`          - Objetivo: ${campaign.objective || 'N/A'}`);
                  
                  if (campaign.daily_budget) {
                    console.log(`          - Presupuesto diario: ${parseFloat(campaign.daily_budget) / 100} ${account.currency}`);
                  }
                  
                  // Obtener insights de la campaña
                  try {
                    const insights = await campaignsManager.getCampaignInsights(campaign.id, {
                      date_preset: 'last_7d'
                    });
                    
                    if (insights.length > 0) {
                      const data = insights[0];
                      console.log(`\n          📊 Insights (últimos 7 días):`);
                      if (data.impressions) console.log(`             - Impresiones: ${data.impressions}`);
                      if (data.clicks) console.log(`             - Clicks: ${data.clicks}`);
                      if (data.spend) console.log(`             - Gasto: ${data.spend} ${account.currency}`);
                      if (data.reach) console.log(`             - Alcance: ${data.reach}`);
                      if (data.ctr) console.log(`             - CTR: ${data.ctr}%`);
                      if (data.cpc) console.log(`             - CPC: ${data.cpc} ${account.currency}`);
                      if (data.cpm) console.log(`             - CPM: ${data.cpm} ${account.currency}`);
                    }
                  } catch (err: any) {
                    console.log(`          ⚠ No se pudieron obtener insights: ${err.response?.data?.error?.message || err.message}`);
                  }
                }
                
                if (campaigns.length > 3) {
                  console.log(`\n        ... y ${campaigns.length - 3} campaña(s) más`);
                }
              } else {
                console.log('     ⚠ No se encontraron campañas en esta cuenta');
              }
            } catch (err: any) {
              console.log(`     ⚠ Error obteniendo campañas: ${err.response?.data?.error?.message || err.message}`);
            }
          }
          
          if (adAccounts.length > 2) {
            console.log(`\n  ... y ${adAccounts.length - 2} cuenta(s) de anuncios más`);
          }
        } else {
          console.log('⚠ No se encontraron cuentas de anuncios asociadas');
        }
      } catch (error: any) {
        console.log('⚠ No se pudieron obtener campañas:', error.response?.data?.error?.message || error.message);
      }

      console.log(`\n${'✓'.repeat(35)} PRUEBA EXITOSA ${'✓'.repeat(35)}`);

    } catch (error: any) {
      console.error(`\n❌ Error probando app ${tokenData.appId}:`, error.message);
      if (error.response?.data) {
        console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
      }
    }

    console.log();
  }

  console.log('='.repeat(70));
  console.log('FacebookTokenManager: Pruebas completadas');
  console.log('='.repeat(70));
  console.log('\n💡 Puedes usar createFacebookClient(appId) en tu código para acceder');
  console.log('   a los datos de Facebook con los tokens siempre actualizados.\n');
}

// Ejecutar pruebas
runTests().catch((error) => {
  console.error('FacebookTokenManager: Error fatal durante las pruebas:', error);
  process.exit(1);
});

