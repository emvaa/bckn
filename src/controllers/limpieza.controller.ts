   import { Request, Response } from 'express';
   import prisma from '../config/database';

   // OBTENER TODAS LAS TAREAS (para admin/recepcionista)
   export const obtenerTodasLasTareas = async (req: Request, res: Response) => {
     try {
       const { estado, prioridad } = req.query;

       const where: any = {};

       if (estado) where.estado = estado;
       if (prioridad) where.prioridad = prioridad;

       const tareas = await prisma.tareaLimpieza.findMany({
         where,
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true,
               email: true
             }
           }
         },
         orderBy: [
           { prioridad: 'desc' },
           { fechaAsignacion: 'asc' }
         ]
       });

       res.json({
         mensaje: 'Tareas obtenidas exitosamente',
         total: tareas.length,
         tareas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener tareas' });
     }
   };

   // OBTENER MIS TAREAS (para personal de limpieza)
   export const obtenerMisTareas = async (req: Request, res: Response) => {
     try {
       const userId = (req as any).userId;

       const tareas = await prisma.tareaLimpieza.findMany({
         where: {
           asignadoAId: userId,
           estado: {
             in: ['pendiente', 'en_proceso']
           }
         },
         include: {
           departamento: {
             include: {
               edificio: true,
               reservas: {
                 where: {
                   estado: {
                     in: ['pendiente', 'confirmada']
                   },
                   fechaInicio: {
                     gte: new Date()
                   }
                 },
                 orderBy: {
                   fechaInicio: 'asc'
                 },
                 take: 1
               }
             }
           }
         },
         orderBy: [
           { prioridad: 'desc' },
           { fechaAsignacion: 'asc' }
         ]
       });

       // Calcular prioridad basada en próximo check-in
       const tareasConPrioridad = tareas.map(tarea => {
         const proximaReserva = tarea.departamento.reservas[0];
         let prioridadCalculada = tarea.prioridad;
         let tiempoRestante = null;

         if (proximaReserva) {
           const ahora = new Date();
           const checkIn = new Date(proximaReserva.fechaInicio);
           const horasRestantes = (checkIn.getTime() - ahora.getTime()) / (1000 * 60 * 60);

           tiempoRestante = Math.round(horasRestantes);

           if (horasRestantes < 2) {
             prioridadCalculada = 'urgente';
           } else if (horasRestantes < 6) {
             prioridadCalculada = 'alta';
           } else if (horasRestantes < 24) {
             prioridadCalculada = 'media';
           }
         }

         return {
           ...tarea,
           prioridadCalculada,
           tiempoRestante,
           proximaReserva: proximaReserva ? {
             fechaInicio: proximaReserva.fechaInicio,
             fechaFin: proximaReserva.fechaFin
           } : null
         };
       });

       res.json({
         mensaje: 'Tus tareas',
         total: tareasConPrioridad.length,
         urgentes: tareasConPrioridad.filter(t => t.prioridadCalculada === 'urgente').length,
         altas: tareasConPrioridad.filter(t => t.prioridadCalculada === 'alta').length,
         medias: tareasConPrioridad.filter(t => t.prioridadCalculada === 'media').length,
         tareas: tareasConPrioridad
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener tus tareas' });
     }
   };

   // OBTENER HISTORIAL DE TAREAS COMPLETADAS
   export const obtenerHistorial = async (req: Request, res: Response) => {
     try {
       const userId = (req as any).userId;
       const userRol = (req as any).userRol;

       const where: any = {
         estado: 'completada'
       };

       // Si es personal de limpieza, solo sus tareas
       if (userRol === 'limpieza') {
         where.asignadoAId = userId;
       }

       const tareas = await prisma.tareaLimpieza.findMany({
         where,
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true
             }
           }
         },
         orderBy: {
           fechaCompletado: 'desc'
         },
         take: 50
       });

       res.json({
         mensaje: 'Historial de tareas',
         total: tareas.length,
         tareas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener historial' });
     }
   };

   // OBTENER DEPARTAMENTOS QUE REQUIEREN LIMPIEZA
   export const obtenerDepartamentosSucios = async (req: Request, res: Response) => {
     try {
       const departamentos = await prisma.departamento.findMany({
         where: {
           requiereLimpieza: true
         },
         include: {
           edificio: true,
           tareasLimpieza: {
             where: {
               estado: {
                 in: ['pendiente', 'en_proceso']
               }
             }
           },
           reservas: {
             where: {
               estado: {
                 in: ['pendiente', 'confirmada']
               },
               fechaInicio: {
                 gte: new Date()
               }
             },
             orderBy: {
               fechaInicio: 'asc'
             },
             take: 1
           }
         }
       });

       // Filtrar solo los que NO tienen tarea asignada
       const sinTarea = departamentos.filter(d => d.tareasLimpieza.length === 0);

       res.json({
         mensaje: 'Departamentos que requieren limpieza',
         total: sinTarea.length,
         departamentos: sinTarea.map(d => ({
           ...d,
           proximoCheckIn: d.reservas[0]?.fechaInicio || null
         }))
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener departamentos sucios' });
     }
   };

   // CREAR TAREA DE LIMPIEZA MANUAL
   export const crearTarea = async (req: Request, res: Response) => {
     try {
       const { 
         departamentoId, 
         asignadoAId, 
         prioridad, 
         tipoLimpieza,
         notas 
       } = req.body;

       if (!departamentoId) {
         return res.status(400).json({ error: 'departamentoId es requerido' });
       }

       // Verificar que el departamento existe
       const departamento = await prisma.departamento.findUnique({
         where: { id: parseInt(departamentoId) }
       });

       if (!departamento) {
         return res.status(404).json({ error: 'Departamento no encontrado' });
       }

       // Verificar que no exista una tarea pendiente para este departamento
       const tareaExistente = await prisma.tareaLimpieza.findFirst({
         where: {
           departamentoId: parseInt(departamentoId),
           estado: {
             in: ['pendiente', 'en_proceso']
           }
         }
       });

       if (tareaExistente) {
         return res.status(400).json({ 
           error: 'Ya existe una tarea pendiente para este departamento' 
         });
       }

       const tarea = await prisma.tareaLimpieza.create({
         data: {
           departamentoId: parseInt(departamentoId),
           asignadoAId: asignadoAId ? parseInt(asignadoAId) : null,
           prioridad: prioridad || 'media',
           tipoLimpieza: tipoLimpieza || 'check_out',
           notas: notas || null
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true
             }
           }
         }
       });

       res.status(201).json({
         mensaje: 'Tarea de limpieza creada exitosamente',
         tarea
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear tarea' });
     }
   };

   // ASIGNAR TAREA A PERSONAL
   export const asignarTarea = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { asignadoAId } = req.body;

       if (!asignadoAId) {
         return res.status(400).json({ error: 'asignadoAId es requerido' });
       }

       // Verificar que el usuario existe y es personal de limpieza
       const usuario = await prisma.usuario.findUnique({
         where: { id: parseInt(asignadoAId) }
       });

       if (!usuario) {
         return res.status(404).json({ error: 'Usuario no encontrado' });
       }

       if (usuario.rol !== 'limpieza') {
         return res.status(400).json({ 
           error: 'Solo se puede asignar a personal de limpieza' 
         });
       }

       const tarea = await prisma.tareaLimpieza.update({
         where: { id: parseInt(id) },
         data: {
           asignadoAId: parseInt(asignadoAId)
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true
             }
           }
         }
       });

       res.json({
         mensaje: 'Tarea asignada exitosamente',
         tarea
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al asignar tarea' });
     }
   };

   // INICIAR LIMPIEZA
   export const iniciarLimpieza = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const userId = (req as any).userId;

       const tarea = await prisma.tareaLimpieza.findUnique({
         where: { id: parseInt(id) }
       });

       if (!tarea) {
         return res.status(404).json({ error: 'Tarea no encontrada' });
       }

       // Verificar que la tarea está asignada a este usuario
       if (tarea.asignadoAId !== userId) {
         return res.status(403).json({ 
           error: 'Esta tarea no está asignada a ti' 
         });
       }

       if (tarea.estado !== 'pendiente') {
         return res.status(400).json({ 
           error: 'La tarea ya fue iniciada o completada' 
         });
       }

       const tareaActualizada = await prisma.tareaLimpieza.update({
         where: { id: parseInt(id) },
         data: {
           estado: 'en_proceso',
           fechaInicio: new Date()
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           }
         }
       });

       res.json({
         mensaje: 'Limpieza iniciada. ¡Buena suerte!',
         tarea: tareaActualizada
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al iniciar limpieza' });
     }
   };

   // COMPLETAR LIMPIEZA
   export const completarLimpieza = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { notas } = req.body;
       const userId = (req as any).userId;

       const tarea = await prisma.tareaLimpieza.findUnique({
         where: { id: parseInt(id) },
         include: {
           departamento: true
         }
       });

       if (!tarea) {
         return res.status(404).json({ error: 'Tarea no encontrada' });
       }

       // Verificar que la tarea está asignada a este usuario
       if (tarea.asignadoAId !== userId) {
         return res.status(403).json({ 
           error: 'Esta tarea no está asignada a ti' 
         });
       }

       if (tarea.estado === 'completada') {
         return res.status(400).json({ 
           error: 'Esta tarea ya fue completada' 
         });
       }

       // Actualizar tarea como completada
       const tareaActualizada = await prisma.tareaLimpieza.update({
         where: { id: parseInt(id) },
         data: {
           estado: 'completada',
           fechaCompletado: new Date(),
           notas: notas || tarea.notas
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true
             }
           }
         }
       });

       // Actualizar departamento: ya no requiere limpieza
       await prisma.departamento.update({
         where: { id: tarea.departamentoId },
         data: {
           requiereLimpieza: false
         }
       });

       res.json({
         mensaje: '✅ ¡Limpieza completada exitosamente! Departamento listo.',
         tarea: tareaActualizada
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al completar limpieza' });
     }
   };

   // REPORTAR PROBLEMA
   export const reportarProblema = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { problema } = req.body;
       const userId = (req as any).userId;

       if (!problema) {
         return res.status(400).json({ error: 'Descripción del problema requerida' });
       }

       const tarea = await prisma.tareaLimpieza.findUnique({
         where: { id: parseInt(id) }
       });

       if (!tarea) {
         return res.status(404).json({ error: 'Tarea no encontrada' });
       }

       // Verificar que la tarea está asignada a este usuario
       if (tarea.asignadoAId !== userId) {
         return res.status(403).json({ 
           error: 'Esta tarea no está asignada a ti' 
         });
       }

       const tareaActualizada = await prisma.tareaLimpieza.update({
         where: { id: parseInt(id) },
         data: {
           problemaReportado: problema
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           asignadoA: {
             select: {
               id: true,
               nombre: true
             }
           }
         }
       });

       res.json({
         mensaje: 'Problema reportado. Se notificó al administrador.',
         tarea: tareaActualizada
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al reportar problema' });
     }
   };

   // OBTENER ESTADÍSTICAS DE LIMPIEZA
   export const obtenerEstadisticas = async (req: Request, res: Response) => {
     try {
       const userId = (req as any).userId;
       const userRol = (req as any).userRol;

       const where: any = {};

       // Si es personal de limpieza, solo sus estadísticas
       if (userRol === 'limpieza') {
         where.asignadoAId = userId;
       }

       const [
         totalTareas,
         pendientes,
         enProceso,
         completadas,
         conProblemas
       ] = await Promise.all([
         prisma.tareaLimpieza.count({ where }),
         prisma.tareaLimpieza.count({ where: { ...where, estado: 'pendiente' } }),
         prisma.tareaLimpieza.count({ where: { ...where, estado: 'en_proceso' } }),
         prisma.tareaLimpieza.count({ where: { ...where, estado: 'completada' } }),
         prisma.tareaLimpieza.count({ 
           where: { 
             ...where, 
             problemaReportado: { not: null } 
           } 
         })
       ]);

       // Calcular tiempo promedio de limpieza
       const tareasConTiempo = await prisma.tareaLimpieza.findMany({
         where: {
           ...where,
           estado: 'completada',
           fechaInicio: { not: null },
           fechaCompletado: { not: null }
         },
         select: {
           fechaInicio: true,
           fechaCompletado: true
         }
       });

       let tiempoPromedio = 0;
       if (tareasConTiempo.length > 0) {
         const tiempos = tareasConTiempo.map(t => {
           const inicio = new Date(t.fechaInicio!).getTime();
           const fin = new Date(t.fechaCompletado!).getTime();
           return (fin - inicio) / (1000 * 60); // minutos
         });
         tiempoPromedio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
       }

       res.json({
         mensaje: 'Estadísticas de limpieza',
         estadisticas: {
           totalTareas,
           pendientes,
           enProceso,
           completadas,
           conProblemas,
           tiempoPromedioMinutos: tiempoPromedio
         }
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener estadísticas' });
     }
   };