import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import warehouseRoutes from './routes/warehouseRoutes';
import stockRoutes from './routes/stockRoutes';
import transferRoutes from './routes/transferRoutes';
import salesRoutes from './routes/salesRoutes';
import clientsRoutes from './routes/clientsRoutes';
import categoryRoutes from './routes/categoryRoutes';
import recognitionRoutes from './routes/recognitionRoutes';
import authRoutes from './routes/authRoutes';

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación de Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); // Permite la comunicación entre el front y el back
app.use(express.json()); // Permite al servidor entender el formato JSON

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));

// Rutas de la API
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recognize', recognitionRoutes);
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
  res.send('¡El servidor del sistema de reconocimiento está funcionando! 🚀');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});