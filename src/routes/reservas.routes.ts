import { Router } from 'express';
   import {
     obtenerReservas,
     obtenerReserva,
     obtenerReservasProximas,
     verificarDisponibilidad,
     crearReserva,
     hacerCheckIn,
     hacerCheckOut,
     registrarPago,
     cancelarReserva,
     actualizarReserva
   } from '../controllers/reservas.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // Rutas de consulta (admin, recepcionista)
   router.get('/proximas', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerReservasProximas);
   router.get('/disponibilidad', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), verificarDisponibilidad);
   router.get('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista', 'contador', 'visor'), obtenerReservas);
   router.get('/:id', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista', 'contador', 'visor'), obtenerReserva);

   // Crear y gestionar reservas (admin, recepcionista)
   router.post('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), crearReserva);
   router.put('/:id', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), actualizarReserva);

   // Check-in y check-out (admin, recepcionista)
   router.post('/:id/check-in', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), hacerCheckIn);
   router.post('/:id/check-out', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), hacerCheckOut);

   // Pagos (admin, recepcionista)
   router.post('/:id/pago', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), registrarPago);

   // Cancelar (solo admin)
   router.post('/:id/cancelar', verificarAuth, verificarRol('super_admin', 'admin'), cancelarReserva);

   export default router;