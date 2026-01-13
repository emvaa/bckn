import { Request, Response } from 'express';
   import prisma from '../config/database';
   import { hashPassword, comparePassword, generateToken } from '../utils/auth.utils';

   // REGISTRO DE USUARIO
   export const registro = async (req: Request, res: Response) => {
     try {
       const { nombre, email, password, rol } = req.body;

       // Validación
       if (!nombre || !email || !password) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos: nombre, email, password' 
         });
       }

       // Verificar si el email ya existe
       const usuarioExiste = await prisma.usuario.findUnique({
         where: { email }
       });

       if (usuarioExiste) {
         return res.status(400).json({ 
           error: 'Este email ya está registrado' 
         });
       }

       // Validar rol
       const rolesValidos = ['super_admin', 'admin', 'recepcionista', 'limpieza', 'contador', 'visor'];
       const rolFinal = rol && rolesValidos.includes(rol) ? rol : 'recepcionista';

       // Encriptar contraseña
       const passwordHash = await hashPassword(password);

       // Crear usuario
       const usuario = await prisma.usuario.create({
         data: {
           nombre,
           email,
           password: passwordHash,
           rol: rolFinal
         }
       });

       // Generar token
       const token = generateToken(usuario.id, usuario.rol);

       // No devolver la contraseña
       const { password: _, ...usuarioSinPassword } = usuario;

       res.status(201).json({
         mensaje: 'Usuario registrado exitosamente',
         usuario: usuarioSinPassword,
         token
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al registrar usuario' });
     }
   };

   // LOGIN
   export const login = async (req: Request, res: Response) => {
     try {
       const { email, password } = req.body;

       // Validación
       if (!email || !password) {
         return res.status(400).json({ 
           error: 'Email y contraseña son requeridos' 
         });
       }

       // Buscar usuario
       const usuario = await prisma.usuario.findUnique({
         where: { email }
       });

       if (!usuario) {
         return res.status(401).json({ 
           error: 'Email o contraseña incorrectos' 
         });
       }

       // Verificar si está activo
       if (!usuario.activo) {
         return res.status(403).json({ 
           error: 'Usuario desactivado. Contacta al administrador' 
         });
       }

       // Verificar contraseña
       const passwordValida = await comparePassword(password, usuario.password);

       if (!passwordValida) {
         return res.status(401).json({ 
           error: 'Email o contraseña incorrectos' 
         });
       }

       // Generar token
       const token = generateToken(usuario.id, usuario.rol);

       // No devolver la contraseña
       const { password: _, ...usuarioSinPassword } = usuario;

       res.json({
         mensaje: 'Login exitoso',
         usuario: usuarioSinPassword,
         token
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al iniciar sesión' });
     }
   };

   // OBTENER PERFIL (requiere estar autenticado)
   export const obtenerPerfil = async (req: Request, res: Response) => {
     try {
       // El ID del usuario viene del middleware de autenticación
       const userId = (req as any).userId;

       const usuario = await prisma.usuario.findUnique({
         where: { id: userId }
       });

       if (!usuario) {
         return res.status(404).json({ error: 'Usuario no encontrado' });
       }

       const { password, ...usuarioSinPassword } = usuario;

       res.json(usuarioSinPassword);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener perfil' });
     }
   };