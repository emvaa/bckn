import { Request, Response } from 'express';
import prisma from '../config/database';

export const generarReporteMensual = async (req: Request, res: Response) => {
  try {
    const { mes, anio } = req.query;
    
    const mesNum = mes ? parseInt(mes as string) : new Date().getMonth();
    const anioNum = anio ? parseInt(anio as string) : new Date().getFullYear();
    
    const inicioMes = new Date(anioNum, mesNum, 1);
    const finMes = new Date(anioNum, mesNum + 1, 0, 23, 59, 59);
    
    const reservas = await prisma.reserva.findMany({
      where: {
        OR: [
          { fechaInicio: { gte: inicioMes, lte: finMes } },
          { fechaFin: { gte: inicioMes, lte: finMes } }
        ],
        estado: { not: 'cancelada' }
      },
      include: {
        cliente: true,
        departamento: { include: { edificio: true } }
      },
      orderBy: { fechaInicio: 'asc' }
    });
    
    const datosReporte = reservas.map(r => {
      const fechaInicio = new Date(r.fechaInicio);
      const fechaFin = new Date(r.fechaFin);
      const dias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: r.id,
        cliente: r.cliente.nombre,
        cedula: r.cliente.cedula || 'N/A',
        telefono: r.cliente.telefono,
        departamento: r.departamento.numero,
        edificio: r.departamento.edificio.nombre,
        check_in: fechaInicio.toLocaleDateString('es-PY'),
        check_out: fechaFin.toLocaleDateString('es-PY'),
        dias_estadia: dias,
        monto: r.monto,
        pagado: r.pagado ? 'Sí' : 'No',
        metodo_pago: r.metodoPago || 'N/A',
        fecha_pago: r.fechaPago ? new Date(r.fechaPago).toLocaleDateString('es-PY') : 'N/A',
        estado: r.estado
      };
    });
    
    const totalIngresos = reservas.filter(r => r.pagado).reduce((sum, r) => sum + r.monto, 0);
    const totalPendientes = reservas.filter(r => !r.pagado).reduce((sum, r) => sum + r.monto, 0);
    
    const resumen = {
      mes: `${mesNum + 1}/${anioNum}`,
      total_reservas: reservas.length,
      reservas_pagadas: reservas.filter(r => r.pagado).length,
      reservas_pendientes: reservas.filter(r => !r.pagado).length,
      total_ingresos: totalIngresos,
      total_pendientes: totalPendientes,
      total_general: totalIngresos + totalPendientes
    };
    
    res.json({ mensaje: 'Reporte mensual generado', resumen, datos: datosReporte });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
};

export const exportarReporteMensual = async (req: Request, res: Response) => {
  try {
    const { mes, anio } = req.query;
    
    const mesNum = mes ? parseInt(mes as string) : new Date().getMonth();
    const anioNum = anio ? parseInt(anio as string) : new Date().getFullYear();
    
    const inicioMes = new Date(anioNum, mesNum, 1);
    const finMes = new Date(anioNum, mesNum + 1, 0, 23, 59, 59);
    
    const reservas = await prisma.reserva.findMany({
      where: {
        OR: [
          { fechaInicio: { gte: inicioMes, lte: finMes } },
          { fechaFin: { gte: inicioMes, lte: finMes } }
        ],
        estado: { not: 'cancelada' }
      },
      include: {
        cliente: true,
        departamento: { include: { edificio: true } }
      },
      orderBy: { fechaInicio: 'asc' }
    });
    
    let csv = 'ID,Cliente,Cédula,Teléfono,Departamento,Edificio,Check-in,Check-out,Días,Monto,Pagado,Método,Fecha Pago,Estado\n';
    
    reservas.forEach(r => {
      const fechaInicio = new Date(r.fechaInicio);
      const fechaFin = new Date(r.fechaFin);
      const dias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      const escapar = (texto: string | null) => {
        if (!texto) return 'N/A';
        return `"${texto.replace(/"/g, '""')}"`;
      };
      
      csv += `${r.id},${escapar(r.cliente.nombre)},${escapar(r.cliente.cedula)},${escapar(r.cliente.telefono)},${escapar(r.departamento.numero)},${escapar(r.departamento.edificio.nombre)},${fechaInicio.toLocaleDateString('es-PY')},${fechaFin.toLocaleDateString('es-PY')},${dias},${r.monto},${r.pagado ? 'Sí' : 'No'},${escapar(r.metodoPago)},${r.fechaPago ? new Date(r.fechaPago).toLocaleDateString('es-PY') : 'N/A'},${escapar(r.estado)}\n`;
    });
    
    const totalIngresos = reservas.filter(r => r.pagado).reduce((sum, r) => sum + r.monto, 0);
    const totalPendientes = reservas.filter(r => !r.pagado).reduce((sum, r) => sum + r.monto, 0);
    
    csv += '\n\n';
    csv += `RESUMEN DEL MES ${mesNum + 1}/${anioNum}\n`;
    csv += `Total Reservas,${reservas.length}\n`;
    csv += `Reservas Pagadas,${reservas.filter(r => r.pagado).length}\n`;
    csv += `Total Ingresos,${totalIngresos}\n`;
    csv += `Total Pendientes,${totalPendientes}\n`;
    csv += `Total General,${totalIngresos + totalPendientes}\n`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${mesNum + 1}_${anioNum}.csv`);
    res.send('\uFEFF' + csv);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al exportar reporte' });
  }
};

export const reiniciarMes = async (req: Request, res: Response) => {
  try {
    await prisma.departamento.updateMany({
      where: { estado: { in: ['ocupado', 'mantenimiento'] } },
      data: { requiereLimpieza: false }
    });
    
    res.json({
      mensaje: 'Mes reiniciado exitosamente',
      fecha: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al reiniciar mes' });
  }
};

export const obtenerEstadisticasReportes = async (req: Request, res: Response) => {
  try {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const inicioMes = new Date(anioActual, mesActual, 1);
    const finMes = new Date(anioActual, mesActual + 1, 0, 23, 59, 59);
    
    const [totalReservasMes, ingresosMes] = await Promise.all([
      prisma.reserva.count({
        where: { fechaInicio: { gte: inicioMes, lte: finMes } }
      }),
      prisma.reserva.aggregate({
        where: {
          pagado: true,
          fechaPago: { gte: inicioMes, lte: finMes }
        },
        _sum: { monto: true }
      })
    ]);
    
    res.json({
      mensaje: 'Estadísticas de reportes',
      mes: `${mesActual + 1}/${anioActual}`,
      estadisticas: {
        totalReservasMes,
        ingresosMes: ingresosMes._sum.monto || 0
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};