import { Router } from 'express';
import upload from '../config/multer'; // Importamos la config de Multer para recibir archivos
import { recognizeProduct } from '../controllers/recognitionController';

const router = Router();

// Definimos la ruta POST /api/recognize
// 1. 'upload.single('image')': Procesa el archivo que viene en el campo 'image'
// 2. 'recognizeProduct': Ejecuta nuestro controlador que habla con Python
router.post('/', upload.single('image'), recognizeProduct);

export default router;