   import { Router } from 'express';
   import {
     obtenerUsuarios,
     obtenerUsuario,
     obtenerPersonalLimpieza,
     crearUsuario,
     actualizarUsuario,
     cambiarPassword,
     cambiarEstadoUsuario,
     eliminarUsuario
   } from '../controllers/usuarios.controller';
   import { verificarAuth, verificarRol } from '../middleware/auth.middleware';

   const router = Router();

   // Solo super_admin puede gestionar usuarios
   router.get('/personal-limpieza', verificarAuth, verificarRol('super_admin', 'admin', 'recepcionista'), obtenerPersonalLimpieza);
   router.get('/', verificarAuth, verificarRol('super_admin'), obtenerUsuarios);
   router.get('/:id', verificarAuth, verificarRol('super_admin'), obtenerUsuario);
   router.post('/', verificarAuth, verificarRol('super_admin'), crearUsuario);
   router.put('/:id', verificarAuth, verificarRol('super_admin'), actualizarUsuario);
   router.patch('/:id/password', verificarAuth, verificarRol('super_admin'), cambiarPassword);
   router.patch('/:id/estado', verificarAuth, verificarRol('super_admin'), cambiarEstadoUsuario);
   router.delete('/:id', verificarAuth, verificarRol('super_admin'), eliminarUsuario);

   export default router;