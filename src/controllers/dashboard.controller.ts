   import { Request, Response } from 'express';
   import prisma from '../config/database';

   // OBTENER ESTADÍSTICAS GENERALES DEL DASHBOARD
   export const obtenerEstadisticasGenerales = async (req: Request, res: Response) => {
     try {
       const userRol = (req as any).userRol;

       // Estadísticas de departamentos
       const departamentos = await prisma.departamento.groupBy({
         by: ['estado'],
         _count: true
       });

       const estadosDepartamentos = {
         total: departamentos.reduce((acc, d) => acc + d._count, 0),
         disponibles: departamentos.find(d => d.estado === 'disponible')?._count || 0,
         reservados: departamentos.find(d => d.estado === 'reservado')?._count || 0,
         ocupados: departamentos.find(d => d.estado === 'ocupado')?._count || 0,
         mantenimiento: departamentos.find(d => d.estado === 'mantenimiento')?._count || 0
       };

       // Estadísticas de reservas
       const [
         totalReservas,
         reservasHoy,
         proximasReservas
       ] = await Promise.all([
         prisma.reserva.count(),
         prisma.reserva.count({
           where: {
             fechaInicio: {
               gte: new Date(new Date().setHours(0, 0, 0, 0)),
               lt: new Date(new Date().setHours(23, 59, 59, 999))
             }
           }
         }),
         prisma.reserva.count({
           where: {
             fechaInicio: {
               gte: new Date(),
               lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
             },
             estado: {
               in: ['pendiente', 'confirmada']
             }
           }
         })
       ]);

       // Estadísticas financieras (solo para roles autorizados)
       let ingresos = null;
       if (['super_admin', 'admin', 'contador', 'visor'].includes(userRol)) {
         const hoy = new Date();
         const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

         const reservasPagadas = await prisma.reserva.aggregate({
           where: {
             pagado: true,
             fechaPago: {
               gte: primerDiaMes
             }
           },
           _sum: {
             monto: true
           }
         });

         ingresos = {
           mes: reservasPagadas._sum.monto || 0
         };
       }

       // Estadísticas de limpieza
       const [
         departamentosSucios,
         tareasLimpiezaPendientes
       ] = await Promise.all([
         prisma.departamento.count({
           where: { requiereLimpieza: true }
         }),
         prisma.tareaLimpieza.count({
           where: {
             estado: {
               in: ['pendiente', 'en_proceso']
             }
           }
         })
       ]);

       res.json({
         mensaje: 'Dashboard general',
         estadisticas: {
           departamentos: estadosDepartamentos,
           reservas: {
             total: totalReservas,
             hoy: reservasHoy,
             proximas: proximasReservas
           },
           ingresos,
           limpieza: {
             departamentosSucios,
             tareasPendientes: tareasLimpiezaPendientes
           }
         }
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener estadísticas' });
     }
   };

   // OBTENER ACTIVIDAD RECIENTE
   export const obtenerActividadReciente = async (req: Request, res: Response) => {
     try {
       const [
         reservasRecientes,
         tareasRecientes,
         clientesRecientes
       ] = await Promise.all([
         prisma.reserva.findMany({
           take: 5,
           orderBy: {
             createdAt: 'desc'
           },
           include: {
             cliente: {
               select: {
                 nombre: true
               }
             },
             departamento: {
               select: {
                 numero: true,
                 edificio: {
                   select: {
                     nombre: true
                   }
                 }
               }
             }
           }
         }),
         prisma.tareaLimpieza.findMany({
           take: 5,
           orderBy: {
             createdAt: 'desc'
           },
           include: {
             departamento: {
               select: {
                 numero: true,
                 edificio: {
                   select: {
                     nombre: true
                   }
                 }
               }
             },
             asignadoA: {
               select: {
                 nombre: true
               }
             }
           }
         }),
         prisma.cliente.findMany({
           take: 5,
           orderBy: {
             createdAt: 'desc'
           },
           select: {
             id: true,
             nombre: true,
             telefono: true,
             createdAt: true
           }
         })
       ]);

       res.json({
         mensaje: 'Actividad reciente',
         actividad: {
           reservas: reservasRecientes,
           tareas: tareasRecientes,
           clientes: clientesRecientes
         }
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener actividad reciente' });
     }
   };

   // OBTENER ALERTAS Y NOTIFICACIONES
   export const obtenerAlertas = async (req: Request, res: Response) => {
     try {
       const alertas: any[] = [];

       // Alerta: Departamentos sucios
       const departamentosSucios = await prisma.departamento.count({
         where: { requiereLimpieza: true }
       });

       if (departamentosSucios > 0) {
         alertas.push({
           tipo: 'limpieza',
           mensaje: `${departamentosSucios} departamento(s) requieren limpieza`,
           prioridad: 'media',
           accion: '/api/limpieza/departamentos-sucios'
         });
       }

       // Alerta: Tareas de limpieza urgentes
       const tareasUrgentes = await prisma.tareaLimpieza.count({
         where: {
           prioridad: 'urgente',
           estado: {
             in: ['pendiente', 'en_proceso']
           }
         }
       });

       if (tareasUrgentes > 0) {
         alertas.push({
           tipo: 'limpieza_urgente',
           mensaje: `${tareasUrgentes} tarea(s) de limpieza URGENTES`,
           prioridad: 'alta',
           accion: '/api/limpieza/todas?prioridad=urgente'
         });
       }

       // Alerta: Reservas pendientes de pago
       const reservasPendientes = await prisma.reserva.count({
         where: {
           pagado: false,
           estado: {
             in: ['pendiente', 'confirmada']
           }
         }
       });

       if (reservasPendientes > 0) {
         alertas.push({
           tipo: 'pagos_pendientes',
           mensaje: `${reservasPendientes} reserva(s) con pago pendiente`,
           prioridad: 'media',
           accion: '/api/reservas?estado=pendiente'
         });
       }

       // Alerta: Check-ins hoy
       const checkInsHoy = await prisma.reserva.count({
         where: {
           fechaInicio: {
             gte: new Date(new Date().setHours(0, 0, 0, 0)),
             lt: new Date(new Date().setHours(23, 59, 59, 999))
           },
           estado: 'pendiente'
         }
       });

       if (checkInsHoy > 0) {
         alertas.push({
           tipo: 'check_ins_hoy',
           mensaje: `${checkInsHoy} check-in(s) programados para hoy`,
           prioridad: 'alta',
           accion: '/api/reservas/proximas'
         });
       }

       res.json({
         mensaje: 'Alertas y notificaciones',
         total: alertas.length,
         alertas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener alertas' });
     }
   };