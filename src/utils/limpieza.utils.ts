   import prisma from '../config/database';

   // CREAR TAREA AUTOMÁTICAMENTE DESPUÉS DE CHECK-OUT
   export const crearTareaAutomatica = async (departamentoId: number) => {
     try {
       // Verificar que no exista una tarea pendiente
       const tareaExistente = await prisma.tareaLimpieza.findFirst({
         where: {
           departamentoId,
           estado: {
             in: ['pendiente', 'en_proceso']
           }
         }
       });

       if (tareaExistente) {
         console.log(`Ya existe una tarea para el departamento ${departamentoId}`);
         return null;
       }

       // Buscar próxima reserva
       const proximaReserva = await prisma.reserva.findFirst({
         where: {
           departamentoId,
           estado: {
             in: ['pendiente', 'confirmada']
           },
           fechaInicio: {
             gte: new Date()
           }
         },
         orderBy: {
           fechaInicio: 'asc'
         }
       });

       // Calcular prioridad
       let prioridad = 'media';
       if (proximaReserva) {
         const ahora = new Date();
         const checkIn = new Date(proximaReserva.fechaInicio);
         const horasRestantes = (checkIn.getTime() - ahora.getTime()) / (1000 * 60 * 60);

         if (horasRestantes < 2) {
           prioridad = 'urgente';
         } else if (horasRestantes < 6) {
           prioridad = 'alta';
         } else if (horasRestantes < 24) {
           prioridad = 'media';
         } else {
           prioridad = 'baja';
         }
       }

       // Buscar personal de limpieza disponible (con menos tareas pendientes)
       const personalDisponible = await prisma.usuario.findMany({
         where: {
           rol: 'limpieza',
           activo: true
         },
         include: {
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
           tareasLimpieza: {
             _count: 'asc'
           }
         }
       });

       const asignadoAId = personalDisponible.length > 0 ? personalDisponible[0].id : null;

       // Crear tarea
       const tarea = await prisma.tareaLimpieza.create({
         data: {
           departamentoId,
           asignadoAId,
           estado: 'pendiente',
           prioridad,
           tipoLimpieza: 'check_out',
           notas: proximaReserva 
             ? `Próximo check-in: ${new Date(proximaReserva.fechaInicio).toLocaleString('es-PY')}`
             : null
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

       console.log(`✅ Tarea de limpieza creada automáticamente para depto ${departamentoId}`);
       return tarea;
     } catch (error) {
       console.error('Error al crear tarea automática:', error);
       return null;
     }
   };