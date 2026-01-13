import { Request, Response, NextFunction } from 'express';
   import { verifyToken } from '../utils/auth.utils';

   // Middleware para verificar autenticación
   export const verificarAuth = (
     req: Request, 
     res: Response, 
     next: NextFunction
   ) => {
     try {
       // Obtener token del header
       const authHeader = req.headers.authorization;

       if (!authHeader) {
         return res.status(401).json({ 
           error: 'No se proporcionó token de autenticación' 
         });
       }

       // El formato es: "Bearer TOKEN_AQUI"
       const token = authHeader.split(' ')[1];

       if (!token) {
         return res.status(401).json({ 
           error: 'Formato de token inválido' 
         });
       }

       // Verificar token
       const decoded = verifyToken(token);

       if (!decoded) {
         return res.status(401).json({ 
           error: 'Token inválido o expirado' 
         });
       }

       // Agregar información del usuario al request
       (req as any).userId = decoded.userId;
       (req as any).userRol = decoded.rol;

       next();
     } catch (error) {
       console.error('Error en auth middleware:', error);
       res.status(500).json({ error: 'Error al verificar autenticación' });
     }
   };

   // Middleware para verificar roles específicos
   export const verificarRol = (...rolesPermitidos: string[]) => {
     return (req: Request, res: Response, next: NextFunction) => {
       const userRol = (req as any).userRol;

       if (!rolesPermitidos.includes(userRol)) {
         return res.status(403).json({ 
           error: 'No tienes permisos para realizar esta acción',
           rolRequerido: rolesPermitidos,
           tuRol: userRol
         });
       }

       next();
     };
   };