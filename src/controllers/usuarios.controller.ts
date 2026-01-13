   import { Request, Response } from 'express';
   import prisma from '../config/database';
   import { hashPassword } from '../utils/auth.utils';

   // OBTENER TODOS LOS USUARIOS (solo super_admin)
   export const obtenerUsuarios = async (req: Request, res: Response) => {
     try {
       const { rol, activo } = req.query;

       const where: any = {};

       if (rol) where.rol = rol;
       if (activo !== undefined) where.activo = activo === 'true';

       const usuarios = await prisma.usuario.findMany({
         where,
         select: {
           id: true,
           nombre: true,
           email: true,
           rol: true,
           activo: true,
           telefono: true,
           createdAt: true,
           updatedAt: true,
           _count: {
             select: {
               tareasLimpieza: true
             }
           }
         },
         orderBy: {
           createdAt: 'desc'
         }
       });

       res.json({
         mensaje: 'Usuarios obtenidos exitosamente',
         total: usuarios.length,
         usuarios
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener usuarios' });
     }
   };

   // OBTENER USUARIO POR ID
   export const obtenerUsuario = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       const usuario = await prisma.usuario.findUnique({
         where: { id: parseInt(id) },
         select: {
           id: true,
           nombre: true,
           email: true,
           rol: true,
           activo: true,
           telefono: true,
           createdAt: true,
           updatedAt: true,
           _count: {
             select: {
               tareasLimpieza: true
             }
           }
         }
       });

       if (!usuario) {
         return res.status(404).json({ error: 'Usuario no encontrado' });
       }

       res.json(usuario);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener usuario' });
     }
   };

   // OBTENER PERSONAL DE LIMPIEZA
   export const obtenerPersonalLimpieza = async (req: Request, res: Response) => {
     try {
       const personal = await prisma.usuario.findMany({
         where: {
           rol: 'limpieza',
           activo: true
         },
         select: {
           id: true,
           nombre: true,
           email: true,
           telefono: true,
           _count: {
             select: {
               tareasLimpieza: {
                 where: {
                   estado: {
                     in: ['pendiente', 'en_proceso']
                   }
                 }
               }
             }
           }
         },
         orderBy: {
           nombre: 'asc'
         }
       });

       res.json({
         mensaje: 'Personal de limpieza',
         total: personal.length,
         personal
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener personal' });
     }
   };

   // CREAR USUARIO
   export const crearUsuario = async (req: Request, res: Response) => {
     try {
       const { nombre, email, password, rol, telefono } = req.body;

       // Validación
       if (!nombre || !email || !password || !rol) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos: nombre, email, password, rol' 
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
       if (!rolesValidos.includes(rol)) {
         return res.status(400).json({ 
           error: 'Rol inválido',
           rolesValidos 
         });
       }

       // Encriptar contraseña
       const passwordHash = await hashPassword(password);

       // Crear usuario
       const usuario = await prisma.usuario.create({
         data: {
           nombre,
           email,
           password: passwordHash,
           rol,
           telefono: telefono || null
         },
         select: {
           id: true,
           nombre: true,
           email: true,
           rol: true,
           activo: true,
           telefono: true,
           createdAt: true
         }
       });

       res.status(201).json({
         mensaje: 'Usuario creado exitosamente',
         usuario
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear usuario' });
     }
   };

   // ACTUALIZAR USUARIO
   export const actualizarUsuario = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { nombre, email, telefono, rol } = req.body;

       const datos: any = {};

       if (nombre) datos.nombre = nombre;
       if (email) datos.email = email;
       if (telefono !== undefined) datos.telefono = telefono;
       if (rol) {
         const rolesValidos = ['super_admin', 'admin', 'recepcionista', 'limpieza', 'contador', 'visor'];
         if (!rolesValidos.includes(rol)) {
           return res.status(400).json({ 
             error: 'Rol inválido',
             rolesValidos 
           });
         }
         datos.rol = rol;
       }

       const usuario = await prisma.usuario.update({
         where: { id: parseInt(id) },
         data: datos,
         select: {
           id: true,
           nombre: true,
           email: true,
           rol: true,
           activo: true,
           telefono: true,
           updatedAt: true
         }
       });

       res.json({
         mensaje: 'Usuario actualizado exitosamente',
         usuario
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al actualizar usuario' });
     }
   };

   // CAMBIAR CONTRASEÑA
   export const cambiarPassword = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { nuevaPassword } = req.body;

       if (!nuevaPassword || nuevaPassword.length < 6) {
         return res.status(400).json({ 
           error: 'La contraseña debe tener al menos 6 caracteres' 
         });
       }

       const passwordHash = await hashPassword(nuevaPassword);

       await prisma.usuario.update({
         where: { id: parseInt(id) },
         data: { password: passwordHash }
       });

       res.json({
         mensaje: 'Contraseña actualizada exitosamente'
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al cambiar contraseña' });
     }
   };

   // ACTIVAR/DESACTIVAR USUARIO
   export const cambiarEstadoUsuario = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { activo } = req.body;

       if (typeof activo !== 'boolean') {
         return res.status(400).json({ error: 'El campo activo debe ser true o false' });
       }

       const usuario = await prisma.usuario.update({
         where: { id: parseInt(id) },
         data: { activo },
         select: {
           id: true,
           nombre: true,
           email: true,
           rol: true,
           activo: true
         }
       });

       res.json({
         mensaje: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`,
         usuario
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al cambiar estado del usuario' });
     }
   };

   // ELIMINAR USUARIO (solo super_admin)
   export const eliminarUsuario = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const userId = (req as any).userId;

       // No permitir que se elimine a sí mismo
       if (parseInt(id) === userId) {
         return res.status(400).json({ 
           error: 'No puedes eliminar tu propio usuario' 
         });
       }

       await prisma.usuario.delete({
         where: { id: parseInt(id) }
       });

       res.json({ mensaje: 'Usuario eliminado exitosamente' });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al eliminar usuario' });
     }
   };