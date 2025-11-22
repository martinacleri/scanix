import { Router } from 'express';
import upload from '../config/multer';
import { 
    getAllProducts, 
    createProduct, 
    getProductById,
    updateProduct,
    deleteProduct,
    getProductsWithDetails
 } from '../controllers/productController';

const router = Router();

// Ruta para obtener todos los productos (GET /api/products)
router.get('/', getAllProducts);

// Ruta para crear un nuevo producto (POST /api/products)
router.post('/', upload.single('image'), createProduct);

router.get('/details', getProductsWithDetails);

// Ruta para obtener un producto por su ID (GET /api/products/1)
router.get('/:id', getProductById);

// Ruta para actualizar un producto (PUT /api/products/1)
router.put('/:id', upload.single('image'), updateProduct);

// Ruta para eliminar un producto (DELETE /api/products/1)
router.delete('/:id', deleteProduct);

export default router;