import { scheduler } from './scheduler';

/**
 * Script principal: Inicia el sistema de auto-renovación de tokens
 */
function main() {
  console.log('='.repeat(60));
  console.log('FacebookTokenManager: Sistema de Auto-Renovación de Tokens');
  console.log('='.repeat(60));
  console.log();

  // Iniciar el scheduler
  scheduler.start();

  // Mantener el proceso ejecutándose
  console.log('FacebookTokenManager: Presiona Ctrl+C para detener el proceso\n');

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\nFacebookTokenManager: Recibida señal de interrupción');
    scheduler.stop();
    console.log('FacebookTokenManager: Sistema detenido correctamente');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nFacebookTokenManager: Recibida señal de terminación');
    scheduler.stop();
    console.log('FacebookTokenManager: Sistema detenido correctamente');
    process.exit(0);
  });
}

// Ejecutar
main();

