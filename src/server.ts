import express from 'express';
import cors from 'cors';
import os from 'os';
import authRoutes from './routes/auth.routes';
import edificiosRoutes from './routes/edificios.routes';
import departamentosRoutes from './routes/departamentos.routes';
import clientesRoutes from './routes/clientes.routes';
import reservasRoutes from './routes/reservas.routes';
import usuariosRoutes from './routes/usuarios.routes';
import limpiezaRoutes from './routes/limpieza.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportesRoutes from './routes/reportes.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter, loginLimiter } from './middleware/rateLimiter';
import compression from 'compression';
import helmet from 'helmet';
import { iniciarTareasProgramadas } from './utils/cron.utils';

const app = express();

// Configuración de CORS - permite acceso desde cualquier origen si CORS_ALLOW_ALL está en true
const corsConfig = process.env.CORS_ALLOW_ALL === 'true' 
  ? {
      origin: '*', // Permitir todos los orígenes
      credentials: false, // No se puede usar credentials con origin: '*'
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Lista blanca de orígenes permitidos
        const allowedOrigins = [
          'http://localhost:8080',
          'http://127.0.0.1:8080',
          process.env.FRONTEND_URL, // Configurar en .env
        ].filter(Boolean) as string[]; // Eliminar valores undefined
        
        // Permitir requests sin origin (como Postman, apps móviles)
        if (!origin) return callback(null, true);
        
        // Verificar si el origin está en la lista blanca
        if (allowedOrigins.includes(origin) || origin.includes('ngrok')) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

app.use(cors(corsConfig));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🏢 API de Gestión de Departamentos',
    version: '2.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      usuarios: '/api/usuarios',
      edificios: '/api/edificios',
      departamentos: '/api/departamentos',
      clientes: '/api/clientes',
      reservas: '/api/reservas',
      limpieza: '/api/limpieza',
      dashboard: '/api/dashboard',
      reportes: '/api/reportes'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/edificios', edificiosRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/limpieza', limpiezaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use(compression());
app.use(helmet());


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', ruta: req.path });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Escuchar en todas las interfaces de red

// Función para obtener la IP local
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    const networkInterfaces = interfaces[name];
    if (networkInterfaces) {
      for (const iface of networkInterfaces) {
        // Ignorar direcciones internas (no IPv4) y no loopback
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

app.use(notFound);
app.use(errorHandler);

app.listen(Number(PORT), HOST, () => {
  const localIP = getLocalIP();
  console.log('═══════════════════════════════════════');
  console.log('  ✅ SERVIDOR FUNCIONANDO');
  console.log(`  🌐 URL Local: http://localhost:${PORT}`);
  console.log(`  🌍 URL Red: http://${localIP}:${PORT}`);
  console.log(`  📅 Fecha: ${new Date().toLocaleString('es-PY')}`);
  console.log('  🗄️  PostgreSQL: Conectado');
  console.log('  🔐 JWT: Activo');
  console.log('  📋 Reservas: Activo');
  console.log('  🧹 Limpieza: Activo');
  console.log('  👥 Usuarios: Activo');
  console.log('  📊 Reportes: Activo');
  console.log('  📅 Calendario: Activo');
  console.log('═══════════════════════════════════════');
  console.log(`  💡 Para acceso externo, usa: http://${localIP}:${PORT}`);
  console.log('═══════════════════════════════════════');
  
  iniciarTareasProgramadas();
});

export default app;