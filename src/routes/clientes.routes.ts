import { Router } from 'express';
   import {
     obtenerClientes,
     obtenerCliente,
     buscarClientes,
     crearCliente,
     actualizarCliente,
     eliminarCliente
   } from '../controllers/clientes.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // Todas las rutas requieren autenticación
   // Solo admin, super_admin y recepcionista pueden gestionar clientes

   router.get('/buscar', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), buscarClientes);
   router.get('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerClientes);
   router.get('/:id', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerCliente);
   router.post('/', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), crearCliente);
   router.put('/:id', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), actualizarCliente);
   router.delete('/:id', verificarAuth, verificarRol('super_admin', 'admin'), eliminarCliente);

   export default router;