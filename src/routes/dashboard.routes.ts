   import { Router } from 'express';
   import {
     obtenerEstadisticasGenerales,
     obtenerActividadReciente,
     obtenerAlertas
   } from '../controllers/dashboard.controller';
   import { verificarAuth } from '../middleware/auth.middleware';

   const router = Router();

   // Todas las rutas requieren autenticación
   router.get('/estadisticas', verificarAuth, obtenerEstadisticasGenerales);
   router.get('/actividad-reciente', verificarAuth, obtenerActividadReciente);
   router.get('/alertas', verificarAuth, obtenerAlertas);

   export default router;