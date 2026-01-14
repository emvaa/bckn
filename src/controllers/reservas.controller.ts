   import { Request, Response } from 'express';
   import prisma from '../config/database';
   import { crearTareaAutomatica } from '../utils/limpieza.utils';
   

   // OBTENER TODAS LAS RESERVAS
   export const obtenerReservas = async (req: Request, res: Response) => {
     try {
       const { estado, fecha } = req.query;

       const where: any = {};

       if (estado) {
         where.estado = estado;
       }

       if (fecha) {
         where.fechaInicio = {
           gte: new Date(fecha as string),
           lt: new Date(new Date(fecha as string).setDate(new Date(fecha as string).getDate() + 1))
         };
       }

       const reservas = await prisma.reserva.findMany({
         where,
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           cliente: true
         },
         orderBy: {
           fechaInicio: 'desc'
         }
       });

       res.json({
         mensaje: 'Reservas obtenidas exitosamente',
         total: reservas.length,
         reservas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener reservas' });
     }
   };

   // OBTENER RESERVA POR ID
   export const obtenerReserva = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       const reserva = await prisma.reserva.findUnique({
         where: { id: parseInt(id) },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           cliente: true
         }
       });

       if (!reserva) {
         return res.status(404).json({ error: 'Reserva no encontrada' });
       }

       res.json(reserva);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener reserva' });
     }
   };

   // OBTENER RESERVAS PRÓXIMAS (próximos 7 días)
   export const obtenerReservasProximas = async (req: Request, res: Response) => {
     try {
       const hoy = new Date();
       const proximos7Dias = new Date();
       proximos7Dias.setDate(hoy.getDate() + 7);

       const reservas = await prisma.reserva.findMany({
         where: {
           fechaInicio: {
             gte: hoy,
             lte: proximos7Dias
           },
           estado: {
             in: ['pendiente', 'confirmada']
           }
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           cliente: true
         },
         orderBy: {
           fechaInicio: 'asc'
         }
       });

       res.json({
         mensaje: 'Reservas próximas',
         total: reservas.length,
         reservas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener reservas próximas' });
     }
   };

   // VERIFICAR DISPONIBILIDAD
   export const verificarDisponibilidad = async (req: Request, res: Response) => {
     try {
       const { departamentoId, fechaInicio, fechaFin } = req.query;

       if (!departamentoId || !fechaInicio || !fechaFin) {
         return res.status(400).json({ 
           error: 'Se requieren: departamentoId, fechaInicio, fechaFin' 
         });
       }

      // Regla: permitir crear reservas el MISMO DÍA del check-out de otra reserva.
      // Para eso evaluamos conflictos por DÍA (checkout es "día exclusivo"), ignorando horas.
      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };

      const nuevaInicio = new Date(fechaInicio as string);
      const nuevaFin = new Date(fechaFin as string);
      const nuevaInicioDia = startOfDay(nuevaInicio);
      const nuevaFinDia = startOfDay(nuevaFin);

      // Traer candidatas (por datetime) y luego filtrar con la regla por día
      const reservasCandidatas = await prisma.reserva.findMany({
         where: {
           departamentoId: parseInt(departamentoId as string),
           estado: {
             not: 'cancelada'
           },
           OR: [
             {
               fechaInicio: {
                 lte: new Date(fechaFin as string)
               },
               fechaFin: {
                 gte: new Date(fechaInicio as string)
               }
             }
           ]
         }
       });

      const reservasConflictivas = reservasCandidatas.filter(r => {
        const rInicioDia = startOfDay(new Date(r.fechaInicio));
        const rFinDiaExclusive = startOfDay(new Date(r.fechaFin)); // checkout = día exclusivo
        // conflicto si hay solapamiento de días: [inicio, finExclusive)
        return nuevaInicioDia < rFinDiaExclusive && nuevaFinDia > rInicioDia;
      });

      const disponible = reservasConflictivas.length === 0;

       res.json({
         disponible,
         mensaje: disponible 
           ? 'El departamento está disponible' 
           : 'El departamento no está disponible en esas fechas',
         conflictos: reservasConflictivas
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al verificar disponibilidad' });
     }
   };

   // CREAR RESERVA
   export const crearReserva = async (req: Request, res: Response) => {
     try {
       const { 
         departamentoId, 
         clienteId, 
         fechaInicio, 
         fechaFin, 
         monto,
         metodoPago,
         estado 
       } = req.body;

       // Validación
       if (!departamentoId || !clienteId || !fechaInicio || !fechaFin || !monto) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos',
           requeridos: ['departamentoId', 'clienteId', 'fechaInicio', 'fechaFin', 'monto']
         });
       }

       // Verificar que el departamento existe
       const departamento = await prisma.departamento.findUnique({
         where: { id: parseInt(departamentoId) }
       });

       if (!departamento) {
         return res.status(404).json({ error: 'Departamento no encontrado' });
       }

       // Verificar que el cliente existe
       const cliente = await prisma.cliente.findUnique({
         where: { id: parseInt(clienteId) }
       });

       if (!cliente) {
         return res.status(404).json({ error: 'Cliente no encontrado' });
       }

      // Verificar disponibilidad (misma regla por DÍA: se permite empezar el día del check-out)
      const startOfDay = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };

      const nuevaInicio = new Date(fechaInicio);
      const nuevaFin = new Date(fechaFin);
      const nuevaInicioDia = startOfDay(nuevaInicio);
      const nuevaFinDia = startOfDay(nuevaFin);

      const reservasCandidatas = await prisma.reserva.findMany({
         where: {
           departamentoId: parseInt(departamentoId),
           estado: {
             not: 'cancelada'
           },
           OR: [
             {
               fechaInicio: {
                 lte: new Date(fechaFin)
               },
               fechaFin: {
                 gte: new Date(fechaInicio)
               }
             }
           ]
         }
       });

      const reservasConflictivas = reservasCandidatas.filter(r => {
        const rInicioDia = startOfDay(new Date(r.fechaInicio));
        const rFinDiaExclusive = startOfDay(new Date(r.fechaFin)); // checkout = día exclusivo
        return nuevaInicioDia < rFinDiaExclusive && nuevaFinDia > rInicioDia;
      });

       // Permitir crear reserva aunque haya conflictos si viene el flag "forzar"
       // Esto permite que el usuario decida crear la reserva de todas formas
       if (reservasConflictivas.length > 0 && !req.body.forzar) {
         return res.status(400).json({ 
           error: 'El departamento no está disponible en esas fechas',
           conflictos: reservasConflictivas,
           puedeForzar: true // Indicar que se puede forzar
         });
       }

       // Crear reserva
       const reserva = await prisma.reserva.create({
         data: {
           departamentoId: parseInt(departamentoId),
           clienteId: parseInt(clienteId),
           fechaInicio: new Date(fechaInicio),
           fechaFin: new Date(fechaFin),
           monto: parseFloat(monto),
           metodoPago: metodoPago || null,
           estado: estado || 'pendiente'
         },
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           cliente: true
         }
       });

       // Actualizar estado del departamento a "reservado"
       await prisma.departamento.update({
         where: { id: parseInt(departamentoId) },
         data: { estado: 'reservado' }
       });

       res.status(201).json({
         mensaje: 'Reserva creada exitosamente',
         reserva
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear reserva' });
     }
   };

   // CHECK-IN
   export const hacerCheckIn = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { notasCheckIn } = req.body;

       const reserva = await prisma.reserva.update({
         where: { id: parseInt(id) },
         data: {
           checkIn: new Date(),
           notasCheckIn: notasCheckIn || null,
           estado: 'confirmada'
         },
         include: {
           departamento: true,
           cliente: true
         }
       });

       // Actualizar estado del departamento a "ocupado"
       await prisma.departamento.update({
         where: { id: reserva.departamentoId },
         data: { 
           estado: 'ocupado',
           requiereLimpieza: false
         }
       });

       res.json({
         mensaje: 'Check-in realizado exitosamente',
         reserva
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al realizar check-in' });
     }
   };

   // CHECK-OUT
   export const hacerCheckOut = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { notasCheckOut } = req.body;

       const reserva = await prisma.reserva.update({
         where: { id: parseInt(id) },
         data: {
           checkOut: new Date(),
           notasCheckOut: notasCheckOut || null,
           estado: 'completada'
         },
         include: {
           departamento: true,
           cliente: true
         }
       });

       // Actualizar estado del departamento
       await prisma.departamento.update({
         where: { id: reserva.departamentoId },
         data: { 
           estado: 'disponible',
           requiereLimpieza: true
         }
       });

       // 🧹 CREAR TAREA DE LIMPIEZA AUTOMÁTICAMENTE
       const tarea = await crearTareaAutomatica(reserva.departamentoId);

       res.json({
         mensaje: 'Check-out realizado exitosamente. Tarea de limpieza creada.',
         reserva,
         tareaLimpieza: tarea
       });
       
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al realizar check-out' });
     }
   };

   

   // REGISTRAR PAGO
   export const registrarPago = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { metodoPago } = req.body;

       if (!metodoPago) {
         return res.status(400).json({ error: 'Método de pago requerido' });
       }

       const reserva = await prisma.reserva.update({
         where: { id: parseInt(id) },
         data: {
           pagado: true,
           metodoPago,
           fechaPago: new Date()
         },
         include: {
           departamento: true,
           cliente: true
         }
       });

       res.json({
         mensaje: 'Pago registrado exitosamente',
         reserva
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al registrar pago' });
     }
   };

   // CANCELAR RESERVA
   export const cancelarReserva = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { motivo } = req.body;

       const reserva = await prisma.reserva.update({
         where: { id: parseInt(id) },
         data: {
           estado: 'cancelada',
           notasCheckOut: motivo || 'Cancelada'
         },
         include: {
           departamento: true
         }
       });

       // Actualizar estado del departamento a "disponible"
       await prisma.departamento.update({
         where: { id: reserva.departamentoId },
         data: { estado: 'disponible' }
       });

       res.json({
         mensaje: 'Reserva cancelada exitosamente',
         reserva
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al cancelar reserva' });
     }
   };

   // ACTUALIZAR RESERVA
   export const actualizarReserva = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const datos = req.body;

       // Convertir fechas si existen
       if (datos.fechaInicio) datos.fechaInicio = new Date(datos.fechaInicio);
       if (datos.fechaFin) datos.fechaFin = new Date(datos.fechaFin);
       if (datos.monto) datos.monto = parseFloat(datos.monto);

       const reserva = await prisma.reserva.update({
         where: { id: parseInt(id) },
         data: datos,
         include: {
           departamento: {
             include: {
               edificio: true
             }
           },
           cliente: true
         }
       });

       res.json({
         mensaje: 'Reserva actualizada exitosamente',
         reserva
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al actualizar reserva' });
     }
   };
