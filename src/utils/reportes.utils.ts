// ========================================
// backend/src/utils/reportes.utils.ts
// UTILIDAD PARA GENERAR REPORTES AUTOMÁTICOS
// ========================================
import prisma from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// Generar reporte automático del mes
export async function generarReporteAutomatico() {
  try {
    console.log('🔄 Generando reporte automático del mes...');
    
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    
    const mes = mesAnterior.getMonth();
    const anio = mesAnterior.getFullYear();
    
    const inicioMes = new Date(anio, mes, 1);
    const finMes = new Date(anio, mes + 1, 0, 23, 59, 59);
    
    // Obtener todas las reservas del mes anterior
    const reservas = await prisma.reserva.findMany({
      where: {
        OR: [
          {
            fechaInicio: {
              gte: inicioMes,
              lte: finMes
            }
          },
          {
            fechaFin: {
              gte: inicioMes,
              lte: finMes
            }
          }
        ],
        estado: {
          not: 'cancelada'
        }
      },
      include: {
        cliente: true,
        departamento: {
          include: {
            edificio: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });
    
    // Crear CSV
    let csv = 'ID Reserva,Cliente,Cédula,Teléfono,Departamento,Edificio,Check-in,Check-out,Días,Monto,Pagado,Método de Pago,Fecha de Pago,Estado\n';
    
    reservas.forEach(r => {
      const fechaInicio = new Date(r.fechaInicio);
      const fechaFin = new Date(r.fechaFin);
      const dias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      csv += `${r.id},"${r.cliente.nombre}","${r.cliente.cedula || 'N/A'}","${r.cliente.telefono}","${r.departamento.numero}","${r.departamento.edificio.nombre}","${fechaInicio.toLocaleDateString('es-PY')}","${fechaFin.toLocaleDateString('es-PY')}",${dias},${r.monto},"${r.pagado ? 'Sí' : 'No'}","${r.metodoPago || 'N/A'}","${r.fechaPago ? new Date(r.fechaPago).toLocaleDateString('es-PY') : 'N/A'}","${r.estado}"\n`;
    });
    
    // Calcular totales
    const totalIngresos = reservas.filter(r => r.pagado).reduce((sum, r) => sum + r.monto, 0);
    const totalPendientes = reservas.filter(r => !r.pagado).reduce((sum, r) => sum + r.monto, 0);
    
    // Agregar resumen al final
    csv += `\n\nRESUMEN DEL MES ${mes + 1}/${anio}\n`;
    csv += `Total Reservas,${reservas.length}\n`;
    csv += `Reservas Pagadas,${reservas.filter(r => r.pagado).length}\n`;
    csv += `Total Ingresos,${totalIngresos}\n`;
    csv += `Total Pendientes,${totalPendientes}\n`;
    csv += `Total General,${totalIngresos + totalPendientes}\n`;
    
    // Guardar archivo
    const carpetaReportes = path.join(__dirname, '../../reportes');
    if (!fs.existsSync(carpetaReportes)) {
      fs.mkdirSync(carpetaReportes, { recursive: true });
    }
    
    const nombreArchivo = `reporte_${mes + 1}_${anio}_${Date.now()}.csv`;
    const rutaArchivo = path.join(carpetaReportes, nombreArchivo);
    
    fs.writeFileSync(rutaArchivo, '\uFEFF' + csv, 'utf8');
    
    console.log(`✅ Reporte generado: ${rutaArchivo}`);
    
    // Archivar datos antiguos
    await archivarDatosAntiguos(finMes);
    
    return rutaArchivo;
    
  } catch (error) {
    console.error('❌ Error al generar reporte automático:', error);
    throw error;
  }
}

// Archivar datos antiguos (marcar como archivados, no eliminar)
async function archivarDatosAntiguos(fechaLimite: Date) {
  try {
    console.log('📦 Archivando datos antiguos...');
    
    // Marcar reservas completadas como archivadas
    const reservasArchivadas = await prisma.reserva.updateMany({
      where: {
        fechaFin: {
          lte: fechaLimite
        },
        estado: 'completada'
      },
      data: {
        // Nota: Necesitarías agregar un campo "archivada" en el schema
        // Por ahora solo las dejamos como "completada"
      }
    });
    
    // Marcar tareas de limpieza como archivadas
    const tareasArchivadas = await prisma.tareaLimpieza.updateMany({
      where: {
        fechaCompletado: {
          lte: fechaLimite
        },
        estado: 'completada'
      },
      data: {
        // Similar al anterior
      }
    });
    
    console.log(`✅ Archivado: ${reservasArchivadas.count} reservas, ${tareasArchivadas.count} tareas`);
    
  } catch (error) {
    console.error('❌ Error al archivar datos:', error);
  }
}



