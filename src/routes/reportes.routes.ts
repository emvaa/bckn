// ========================================
// backend/src/routes/reportes.routes.ts
// ========================================
import { Router } from 'express';
import {
  generarReporteMensual,
  exportarReporteMensual,
  reiniciarMes,
  obtenerEstadisticasReportes
} from '../controllers/reportes.controller';
import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

const router = Router();

// Obtener reporte mensual (todos los autorizados)
router.get('/mensual', 
  verificarAuth, 
  verificarRol('super_admin', 'admin', 'contador', 'visor'), 
  generarReporteMensual
);

// Exportar reporte a CSV
router.get('/exportar', 
  verificarAuth, 
  verificarRol('super_admin', 'admin', 'contador'), 
  exportarReporteMensual
);

// Estadísticas de reportes
router.get('/estadisticas', 
  verificarAuth, 
  obtenerEstadisticasReportes
);

// Reiniciar mes (solo super_admin)
router.post('/reiniciar-mes', 
  verificarAuth, 
  verificarRol('super_admin'), 
  reiniciarMes
);

export default router;


