/**
 * Ejemplos de uso del sistema de tokens de Facebook
 * 
 * Este archivo muestra cómo usar las diferentes funcionalidades
 * para obtener datos de Facebook, Instagram y campañas publicitarias
 */

import { createFacebookClient } from './facebookClient';
import { InsightsManager } from './insights';
import { CampaignsManager } from './campaigns';

// ============================================
// EJEMPLO 1: Obtener datos básicos
// ============================================
async function ejemploBasico() {
  // Crear cliente con el App ID
  const client = createFacebookClient('2479333962419437');
  
  // Obtener información del usuario
  const user = await client.get('/me', { fields: 'id,name,email' });
  console.log('Usuario:', user);
  
  // Obtener páginas
  const pages = await client.get('/me/accounts', { fields: 'id,name' });
  console.log('Páginas:', pages.data);
}

// ============================================
// EJEMPLO 2: Obtener insights de páginas
// ============================================
async function ejemploInsightsPaginas() {
  const client = createFacebookClient('2479333962419437');
  const insightsManager = new InsightsManager(client);
  
  // Primero obtener páginas
  const pagesData = await client.get('/me/accounts', {
    fields: 'id,name,access_token'
  });
  
  for (const page of pagesData.data) {
    // Obtener insights de cada página
    const insights = await insightsManager.getPageInsights(
      page.id,
      page.access_token,
      {
        metric: [
          'page_impressions',           // Impresiones
          'page_engaged_users',         // Usuarios enganchados
          'page_fans',                  // Fans totales
          'page_post_engagements',      // Engagements de posts
          'page_views_total',           // Vistas totales
        ],
        period: 'day',
      }
    );
    
    console.log(`Insights de ${page.name}:`, insights);
  }
}

// ============================================
// EJEMPLO 3: Obtener insights de Instagram
// ============================================
async function ejemploInsightsInstagram() {
  const client = createFacebookClient('2479333962419437');
  const insightsManager = new InsightsManager(client);
  
  // Obtener cuentas de Instagram Business
  const igData = await client.get('/me/accounts', {
    fields: 'instagram_business_account{id,username}'
  });
  
  for (const page of igData.data) {
    if (page.instagram_business_account) {
      const igAccount = page.instagram_business_account;
      
      // Obtener insights de Instagram
      const insights = await insightsManager.getInstagramInsights(
        igAccount.id,
        {
          metric: [
            'impressions',              // Impresiones
            'reach',                    // Alcance
            'follower_count',           // Seguidores
            'profile_views',            // Vistas de perfil
          ],
          period: 'day',
        }
      );
      
      console.log(`Insights de @${igAccount.username}:`, insights);
    }
  }
}

// ============================================
// EJEMPLO 4: Obtener campañas publicitarias
// ============================================
async function ejemploCampañas() {
  const client = createFacebookClient('2479333962419437');
  const campaignsManager = new CampaignsManager(client);
  
  // Obtener cuentas de anuncios
  const adAccounts = await campaignsManager.getAdAccounts();
  
  for (const account of adAccounts) {
    console.log(`Cuenta: ${account.name}`);
    
    // Obtener campañas de la cuenta
    const campaigns = await campaignsManager.getCampaigns(account.id);
    
    for (const campaign of campaigns) {
      console.log(`\nCampaña: ${campaign.name}`);
      
      // Obtener insights de la campaña (últimos 30 días)
      const insights = await campaignsManager.getCampaignInsights(campaign.id, {
        date_preset: 'last_30d'
      });
      
      if (insights.length > 0) {
        const data = insights[0];
        console.log('Métricas:');
        console.log('  - Impresiones:', data.impressions);
        console.log('  - Clicks:', data.clicks);
        console.log('  - Gasto:', data.spend);
        console.log('  - Alcance:', data.reach);
        console.log('  - CTR:', data.ctr);
        console.log('  - CPC:', data.cpc);
      }
    }
  }
}

// ============================================
// EJEMPLO 5: Obtener insights de cuenta con fechas personalizadas
// ============================================
async function ejemploInsightsFechasPersonalizadas() {
  const client = createFacebookClient('2479333962419437');
  const campaignsManager = new CampaignsManager(client);
  
  const adAccounts = await campaignsManager.getAdAccounts();
  
  if (adAccounts.length > 0) {
    const account = adAccounts[0];
    
    // Obtener insights de un período específico
    const insights = await campaignsManager.getAccountInsights(account.id, {
      time_range: {
        since: '2025-10-01',
        until: '2025-10-31'
      },
      level: 'campaign' // Nivel de reporte: account, campaign, adset, ad
    });
    
    console.log('Insights de octubre 2025:', insights);
  }
}

// ============================================
// EJEMPLO 6: Obtener conjuntos de anuncios (Ad Sets) y anuncios
// ============================================
async function ejemploAdSetsYAnuncios() {
  const client = createFacebookClient('2479333962419437');
  const campaignsManager = new CampaignsManager(client);
  
  const adAccounts = await campaignsManager.getAdAccounts();
  
  for (const account of adAccounts) {
    const campaigns = await campaignsManager.getCampaigns(account.id);
    
    for (const campaign of campaigns.slice(0, 1)) { // Solo primera campaña
      console.log(`Campaña: ${campaign.name}`);
      
      // Obtener ad sets de la campaña
      const adSets = await campaignsManager.getAdSets(campaign.id);
      
      for (const adSet of adSets) {
        console.log(`  Ad Set: ${adSet.name}`);
        
        // Obtener anuncios del ad set
        const ads = await campaignsManager.getAds(adSet.id);
        
        for (const ad of ads) {
          console.log(`    Anuncio: ${ad.name}`);
          console.log(`    Estado: ${ad.status}`);
        }
      }
    }
  }
}

// ============================================
// EJEMPLO 7: Monitoreo continuo de métricas
// ============================================
async function ejemploMonitoreoContinuo() {
  const client = createFacebookClient('2479333962419437');
  const campaignsManager = new CampaignsManager(client);
  
  // Ejecutar cada hora
  setInterval(async () => {
    console.log('Actualizando métricas...', new Date().toISOString());
    
    const adAccounts = await campaignsManager.getAdAccounts();
    
    for (const account of adAccounts) {
      // Obtener insights del día actual
      const insights = await campaignsManager.getAccountInsights(account.id, {
        date_preset: 'today',
        level: 'account'
      });
      
      if (insights.length > 0) {
        const data = insights[0];
        console.log(`${account.name}:`);
        console.log(`  Gasto hoy: ${data.spend}`);
        console.log(`  Clicks: ${data.clicks}`);
        console.log(`  Alcance: ${data.reach}`);
      }
    }
  }, 60 * 60 * 1000); // Cada hora
}

// Exportar ejemplos
export {
  ejemploBasico,
  ejemploInsightsPaginas,
  ejemploInsightsInstagram,
  ejemploCampañas,
  ejemploInsightsFechasPersonalizadas,
  ejemploAdSetsYAnuncios,
  ejemploMonitoreoContinuo,
};

