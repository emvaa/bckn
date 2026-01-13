import { Request, Response } from 'express';
   import prisma from '../config/database';

   // OBTENER TODOS LOS CLIENTES
   export const obtenerClientes = async (req: Request, res: Response) => {
     try {
       const clientes = await prisma.cliente.findMany({
         include: {
           _count: {
             select: { reservas: true }
           }
         },
         orderBy: {
           createdAt: 'desc'
         }
       });

       res.json({
         mensaje: 'Clientes obtenidos exitosamente',
         total: clientes.length,
         clientes
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener clientes' });
     }
   };

   // OBTENER CLIENTE POR ID
   export const obtenerCliente = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       const cliente = await prisma.cliente.findUnique({
         where: { id: parseInt(id) },
         include: {
           reservas: {
             include: {
               departamento: {
                 include: {
                   edificio: true
                 }
               }
             },
             orderBy: {
               createdAt: 'desc'
             }
           }
         }
       });

       if (!cliente) {
         return res.status(404).json({ error: 'Cliente no encontrado' });
       }

       res.json(cliente);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener cliente' });
     }
   };

   // BUSCAR CLIENTES
   export const buscarClientes = async (req: Request, res: Response) => {
     try {
       const { busqueda } = req.query;

       if (!busqueda) {
         return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
       }

       const clientes = await prisma.cliente.findMany({
         where: {
           OR: [
             { nombre: { contains: busqueda as string, mode: 'insensitive' } },
             { telefono: { contains: busqueda as string } },
             { email: { contains: busqueda as string, mode: 'insensitive' } },
             { cedula: { contains: busqueda as string } }
           ]
         },
         include: {
           _count: {
             select: { reservas: true }
           }
         }
       });

       res.json({
         mensaje: `${clientes.length} cliente(s) encontrado(s)`,
         clientes
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al buscar clientes' });
     }
   };

   // CREAR CLIENTE
   export const crearCliente = async (req: Request, res: Response) => {
     try {
       const { nombre, telefono, whatsapp, email, cedula, direccion, notas } = req.body;

       // Validación
       if (!nombre || !telefono) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos: nombre y teléfono' 
         });
       }

       // Verificar si ya existe (por teléfono o cédula)
       if (cedula) {
         const clienteExiste = await prisma.cliente.findFirst({
           where: { cedula }
         });

         if (clienteExiste) {
           return res.status(400).json({ 
             error: 'Ya existe un cliente con esta cédula' 
           });
         }
       }

       const cliente = await prisma.cliente.create({
         data: {
           nombre,
           telefono,
           whatsapp: whatsapp || telefono,
           email: email || null,
           cedula: cedula || null,
           direccion: direccion || null,
           notas: notas || null
         }
       });

       res.status(201).json({
         mensaje: 'Cliente creado exitosamente',
         cliente
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear cliente' });
     }
   };

   // ACTUALIZAR CLIENTE
   export const actualizarCliente = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const datos = req.body;

       const cliente = await prisma.cliente.update({
         where: { id: parseInt(id) },
         data: datos
       });

       res.json({
         mensaje: 'Cliente actualizado exitosamente',
         cliente
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al actualizar cliente' });
     }
   };

   // ELIMINAR CLIENTE
   export const eliminarCliente = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       // Verificar si tiene reservas
       const cliente = await prisma.cliente.findUnique({
         where: { id: parseInt(id) },
         include: {
           _count: {
             select: { reservas: true }
           }
         }
       });

       if (cliente && cliente._count.reservas > 0) {
         return res.status(400).json({ 
           error: 'No se puede eliminar un cliente con reservas registradas',
           reservas: cliente._count.reservas
         });
       }

       await prisma.cliente.delete({
         where: { id: parseInt(id) }
       });

       res.json({ mensaje: 'Cliente eliminado exitosamente' });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al eliminar cliente' });
     }
   };