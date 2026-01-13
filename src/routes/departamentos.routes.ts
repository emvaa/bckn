import { Router } from 'express';
   import {
     obtenerDepartamentos,
     obtenerDepartamento,
     obtenerDepartamentosPorEdificio,
     obtenerDepartamentosDisponibles,
     crearDepartamento,
     actualizarDepartamento,
     cambiarEstado,
     eliminarDepartamento
   } from '../controllers/departamentos.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // Todos los autenticados pueden ver
   router.get('/disponibles', verificarAuth, obtenerDepartamentosDisponibles);
   router.get('/edificio/:edificioId', verificarAuth, obtenerDepartamentosPorEdificio);
   router.get('/', verificarAuth, obtenerDepartamentos);
   router.get('/:id', verificarAuth, obtenerDepartamento);

   // Solo admin, super_admin y recepcionista pueden crear
   router.post('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), crearDepartamento);

   // Solo admin y super_admin pueden editar
   router.put('/:id', verificarAuth, verificarRol('super_admin', 'admin'), actualizarDepartamento);

   // Admin, recepcionista y limpieza pueden cambiar estado
   router.patch('/:id/estado', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista', 'limpieza'), cambiarEstado);

   // Solo super_admin puede eliminar
   router.delete('/:id', verificarAuth, verificarRol('super_admin'), eliminarDepartamento);

   export default router;