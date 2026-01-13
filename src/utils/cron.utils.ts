// ========================================
// backend/src/utils/cron.utils.ts
// TAREAS PROGRAMADAS (CRON JOBS)
// ========================================
import { generarReporteAutomatico } from './reportes.utils';

// Función para ejecutar tareas programadas
export function iniciarTareasProgramadas() {
  console.log('⏰ Iniciando tareas programadas...');
  
  // Verificar si es primer día del mes a las 00:01
  setInterval(async () => {
    const ahora = new Date();
    
    // Si es día 1 del mes y son las 00:00
    if (ahora.getDate() === 1 && ahora.getHours() === 0 && ahora.getMinutes() <= 5) {
      console.log('📅 Primer día del mes detectado - Generando reporte...');
      
      try {
        await generarReporteAutomatico();
        console.log('✅ Reporte mensual generado exitosamente');
      } catch (error) {
        console.error('❌ Error al generar reporte mensual:', error);
      }
    }
  }, 5 * 60 * 1000); // Verificar cada 5 minutos
  
  console.log('✅ Tareas programadas iniciadas');
}
