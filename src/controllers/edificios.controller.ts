import { Request, Response } from 'express';
   import prisma from '../config/database';

   // OBTENER TODOS LOS EDIFICIOS
   export const obtenerEdificios = async (req: Request, res: Response) => {
     try {
       const edificios = await prisma.edificio.findMany({
         include: {
           _count: {
             select: { departamentos: true }
           }
         }
       });

       res.json({
         mensaje: 'Edificios obtenidos exitosamente',
         total: edificios.length,
         edificios
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ 
         error: 'Error al obtener edificios',
         detalle: error 
       });
     }
   };

   // OBTENER UN EDIFICIO POR ID
   export const obtenerEdificio = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       const edificio = await prisma.edificio.findUnique({
         where: { id: parseInt(id) },
         include: {
           departamentos: true
         }
       });

       if (!edificio) {
         return res.status(404).json({ error: 'Edificio no encontrado' });
       }

       res.json(edificio);
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al obtener edificio' });
     }
   };

   // CREAR EDIFICIO
   export const crearEdificio = async (req: Request, res: Response) => {
     try {
       const { nombre, direccion, ciudad, totalPisos } = req.body;

       // Validación simple
       if (!nombre || !direccion) {
         return res.status(400).json({ 
           error: 'Faltan datos requeridos: nombre y dirección' 
         });
       }

       const edificio = await prisma.edificio.create({
         data: {
           nombre,
           direccion,
           ciudad: ciudad || 'Asunción',
           totalPisos: totalPisos || 1
         }
       });

       res.status(201).json({
         mensaje: 'Edificio creado exitosamente',
         edificio
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al crear edificio' });
     }
   };

   // ACTUALIZAR EDIFICIO
   export const actualizarEdificio = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;
       const datos = req.body;

       const edificio = await prisma.edificio.update({
         where: { id: parseInt(id) },
         data: datos
       });

       res.json({
         mensaje: 'Edificio actualizado exitosamente',
         edificio
       });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al actualizar edificio' });
     }
   };

   // ELIMINAR EDIFICIO
   export const eliminarEdificio = async (req: Request, res: Response) => {
     try {
       const { id } = req.params;

       await prisma.edificio.delete({
         where: { id: parseInt(id) }
       });

       res.json({ mensaje: 'Edificio eliminado exitosamente' });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Error al eliminar edificio' });
     }
   };