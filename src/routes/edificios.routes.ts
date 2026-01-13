import { Router } from 'express';
   import {
     obtenerEdificios,
     obtenerEdificio,
     crearEdificio,
     actualizarEdificio,
     eliminarEdificio
   } from '../controllers/edificios.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // Rutas públicas o para todos los autenticados
   router.get('/', verificarAuth, obtenerEdificios);
   router.get('/:id', verificarAuth, obtenerEdificio);

   // Solo admin y super_admin pueden crear/editar/eliminar
   router.post('/', verificarAuth, verificarRol('super_admin', 'admin'), crearEdificio);
   router.put('/:id', verificarAuth, verificarRol('super_admin', 'admin'), actualizarEdificio);
   router.delete('/:id', verificarAuth, verificarRol('super_admin', 'admin'), eliminarEdificio);

   export default router;