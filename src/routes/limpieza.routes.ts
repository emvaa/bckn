   import { Router } from 'express';
   import {
     obtenerTodasLasTareas,
     obtenerMisTareas,
     obtenerHistorial,
     obtenerDepartamentosSucios,
     crearTarea,
     asignarTarea,
     iniciarLimpieza,
     completarLimpieza,
     reportarProblema,
     obtenerEstadisticas
   } from '../controllers/limpieza.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // 🧹 RUTAS PARA PERSONAL DE LIMPIEZA
   router.get('/mis-tareas', verificarAuth, verificarRol('limpieza'), obtenerMisTareas);
   router.get('/historial', verificarAuth, verificarRol('limpieza', 'admin', 'super_admin'), obtenerHistorial);
   router.post('/:id/iniciar', verificarAuth, verificarRol('limpieza'), iniciarLimpieza);
   router.post('/:id/completar', verificarAuth, verificarRol('limpieza'), completarLimpieza);
   router.post('/:id/problema', verificarAuth, verificarRol('limpieza'), reportarProblema);

   // 📊 RUTAS PARA ADMIN/RECEPCIONISTA
   router.get('/todas', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerTodasLasTareas);
   router.get('/departamentos-sucios', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerDepartamentosSucios);
   router.get('/estadisticas', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista', 'limpieza'), obtenerEstadisticas);
   router.post('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), crearTarea);
   router.put('/:id/asignar', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), asignarTarea);

   export default router;