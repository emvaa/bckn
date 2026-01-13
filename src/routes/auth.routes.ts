import { Router } from 'express';
   import { registro, login, obtenerPerfil } from '../controllers/auth.controller';
   import { verificarAuth } from '../middleware/auth.middleware';

   const router = Router();

   // Rutas públicas (no requieren autenticación)
   router.post('/registro', registro);
   router.post('/login', login);

   // Rutas protegidas (requieren autenticación)
   router.get('/perfil', verificarAuth, obtenerPerfil);

   export default router;