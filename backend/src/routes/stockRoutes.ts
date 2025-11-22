import { Router } from 'express';
import {
    getStockByWarehouse,
    getStockByProduct,
    getSpecificStockItem,
    adjustStock
} from '../controllers/stockController';

const router = Router();

// Ruta para obtener el stock de un warehouse
router.get('/warehouse/:warehouseId', getStockByWarehouse);

// Ruta para obtener el stock de un producto
router.get('/product/:productId', getStockByProduct);

// Ruta para obtener el stock de un item específico en un warehouse específico
router.get('/item/:warehouseId/:productId', getSpecificStockItem);

// Ruta para añadir o ajustar el stock
router.post('/adjust', adjustStock);

export default router;