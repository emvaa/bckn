import { Request, Response } from 'express';
   import prisma from '../config/database';

   // OBTENER TODOS LOS DEPARTAMENTOS
   export const obtenerDepartamentos = async (req: Request, res: Response) => {
     try {
       const departamentos = await prisma.departamento.findMany({
         include: {
           edificio: true
         },
         orderBy: {
           edificioId: 'asc'
         }
       });

       res.json({
         mensaje: 'Departamentos obtenidos exitosamente',
         total: departamentos.length,
         departamentos
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener departamentos' });
     }
   };

   // OBTENER DEPARTAMENTO POR ID
   export const obtenerDepartamento = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       const departamento = await prisma.departamento.findUnique({
         where: { id: parseInt(id) },
         include: {
           edificio: true
         }
       });

       if (!departamento) {
         return res.status(404).json({ error: 'Departamento no encontrado' });
       }

       res.json(departamento);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener departamento' });
     }
   };

   // OBTENER DEPARTAMENTOS POR EDIFICIO
   export const obtenerDepartamentosPorEdificio = async (req: Request, res: Response) => {
     try {
       const { edificioId } = req.params;

       const departamentos = await prisma.departamento.findMany({
         where: { edificioId: parseInt(edificioId) },
         include: {
           edificio: true
         }
       });

       res.json({
         mensaje: 'Departamentos obtenidos exitosamente',
         total: departamentos.length,
         departamentos
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener departamentos' });
     }
   };

   // OBTENER DEPARTAMENTOS DISPONIBLES
   export const obtenerDepartamentosDisponibles = async (req: Request, res: Response) => {
     try {
       const departamentos = await prisma.departamento.findMany({
         where: { estado: 'disponible' },
         include: {
           edificio: true
         }
       });

       res.json({
         mensaje: 'Departamentos disponibles',
         total: departamentos.length,
         departamentos
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener departamentos' });
     }
   };

   // CREAR DEPARTAMENTO
   export const crearDepartamento = async (req: Request, res: Response) => {
     try {
       const { 
         numero, 
         edificioId, 
         piso, 
         habitaciones, 
         banos, 
         precio,
         descripcion 
       } = req.body;

       // Validación
       if (!numero || !edificioId || !piso || !habitaciones || !banos || !precio) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos',
           requeridos: ['numero', 'edificioId', 'piso', 'habitaciones', 'banos', 'precio']
         });
       }

       // Verificar que el edificio existe
       const edificio = await prisma.edificio.findUnique({
         where: { id: parseInt(edificioId) }
       });

       if (!edificio) {
         return res.status(404).json({ error: 'El edificio no existe' });
       }

       // Verificar que no exista un departamento con ese número en ese edificio
       const departamentoExiste = await prisma.departamento.findFirst({
         where: {
           numero,
           edificioId: parseInt(edificioId)
         }
       });

       if (departamentoExiste) {
         return res.status(400).json({ 
           error: `Ya existe el departamento ${numero} en este edificio` 
         });
       }

       const departamento = await prisma.departamento.create({
         data: {
           numero,
           edificioId: parseInt(edificioId),
           piso: parseInt(piso),
           habitaciones: parseInt(habitaciones),
           banos: parseInt(banos),
           precio: parseFloat(precio),
           descripcion: descripcion || null
         },
         include: {
           edificio: true
         }
       });

       res.status(201).json({
         mensaje: 'Departamento creado exitosamente',
         departamento
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear departamento' });
     }
   };

   // ACTUALIZAR DEPARTAMENTO
   export const actualizarDepartamento = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const datos = req.body;

       // Convertir tipos si es necesario
       if (datos.edificioId) datos.edificioId = parseInt(datos.edificioId);
       if (datos.piso) datos.piso = parseInt(datos.piso);
       if (datos.habitaciones) datos.habitaciones = parseInt(datos.habitaciones);
       if (datos.banos) datos.banos = parseInt(datos.banos);
       if (datos.precio) datos.precio = parseFloat(datos.precio);

       const departamento = await prisma.departamento.update({
         where: { id: parseInt(id) },
         data: datos,
         include: {
           edificio: true
         }
       });

       res.json({
         mensaje: 'Departamento actualizado exitosamente',
         departamento
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al actualizar departamento' });
     }
   };

   // CAMBIAR ESTADO DEL DEPARTAMENTO
   export const cambiarEstado = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const { estado } = req.body;

       const estadosValidos = ['disponible', 'reservado', 'ocupado', 'mantenimiento'];
       
       if (!estadosValidos.includes(estado)) {
         return res.status(400).json({ 
           error: 'Estado inválido',
           estadosValidos 
         });
       }

       const departamento = await prisma.departamento.update({
         where: { id: parseInt(id) },
         data: { 
           estado,
           requiereLimpieza: estado === 'ocupado' ? false : estado === 'disponible' ? false : undefined
         },
         include: {
           edificio: true
         }
       });

       res.json({
         mensaje: `Estado cambiado a: ${estado}`,
         departamento
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al cambiar estado' });
     }
   };

   // ELIMINAR DEPARTAMENTO
   export const eliminarDepartamento = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       await prisma.departamento.delete({
         where: { id: parseInt(id) }
       });

       res.json({ mensaje: 'Departamento eliminado exitosamente' });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al eliminar departamento' });
     }
   };