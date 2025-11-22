import { Request, Response } from 'express';
import knex from '../database/connection';

// 1. Obtener todo el stock de un warehouse específico
export const getStockByWarehouse = async (req: Request, res: Response) => {
    const { warehouseId } = req.params;
    try {
        const stock = await knex('stock')
            .join('products', 'stock.product_id', 'products.id')
            .where('stock.warehouse_id', warehouseId)
            .select(
                'products.id as productId',
                'products.name',
                'products.sku',
                'stock.quantity'
            );

        if (stock.length === 0) {
            return res.status(404).json({ message: 'No se encontró stock para este depósito o el depósito no existe.' });
        }
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el stock.' });
    }
};

// 2. Obtener la ubicación y stock de un producto específico
export const getStockByProduct = async (req: Request, res: Response) => {
    const { productId } = req.params;
    try {
        const stock = await knex('stock')
            .join('warehouses', 'stock.warehouse_id', 'warehouses.id')
            .where('stock.product_id', productId)
            .select(
                'warehouses.id as warehouseId',
                'warehouses.name',
                'stock.quantity'
            );

        if (stock.length === 0) {
            return res.status(404).json({ message: 'No se encontró stock para este producto o el producto no existe.' });
        }
        res.status(200).json(stock);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el stock.' });
    }
};

// 3. Obtener el stock de un item específico (tu consulta)
export const getSpecificStockItem = async (req: Request, res: Response) => {
    const { warehouseId, productId } = req.params;
    try {
        const item = await knex('stock')
            .where({
                warehouse_id: warehouseId,
                product_id: productId
            })
            .first(); // .first() para obtener solo un objeto, no un array

        if (!item) {
            return res.status(404).json({ message: 'No se encontró este producto en el depósito especificado.' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el stock.' });
    }
};

// 4. Añadir o ajustar el stock de un item
export const adjustStock = async (req: Request, res: Response) => {
    const { productId, warehouseId, changeQuantity } = req.body;

    // Validación básica
    if (productId === undefined || warehouseId === undefined || changeQuantity === undefined) {
        return res.status(400).json({ error: 'ID del producto, ID del depósito y cantidad son obligatorios.' });
    }
    if (typeof changeQuantity !== 'number' || changeQuantity === 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número distinto de cero.' });
    }

    try {
        // Verificamos que tanto el producto como el warehouse existan
        const [product, warehouse] = await Promise.all([
            knex('products').where('id', productId).first(),
            knex('warehouses').where('id', warehouseId).first()
        ]);

        if (!product) {
            return res.status(404).json({ error: `El producto con ID ${productId} no existe.` });
        }
        if (!warehouse) {
            return res.status(404).json({ error: `El depósito con ID ${warehouseId} no existe.` });
        }

        const existingStock = await knex('stock').where({
            product_id: productId,
            warehouse_id: warehouseId
        }).first();

        if (existingStock) {
            // --- LÓGICA DE AJUSTE ---
            const newQuantity = existingStock.quantity + changeQuantity;

            // No permitir stock negativo
            if (newQuantity < 0) {
                return res.status(400).json({ error: `Stock insuficiente. Cantidad actual: ${existingStock.quantity}, se intentó restar: ${Math.abs(changeQuantity)}.` });
            }

            const [updatedStock] = await knex('stock')
                .where('id', existingStock.id)
                .update({ quantity: newQuantity, updated_at: new Date() })
                .returning('*');
            return res.status(200).json({ message: 'Stock actualizado.', stock: updatedStock });

        } else {
            // --- LÓGICA PARA NUEVOS ITEMS ---
            // No se puede crear un nuevo registro de stock con una cantidad negativa
            if (changeQuantity < 0) {
                return res.status(400).json({ error: 'No se puede registrar una salida de stock para un producto que no tiene inventario inicial en este depósito.' });
            }

            const [newStock] = await knex('stock').insert({
                product_id: productId,
                warehouse_id: warehouseId,
                quantity: changeQuantity
            }).returning('*');
            return res.status(201).json({ message: 'Stock creado.', stock: newStock });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al ajustar el stock.' });
    }
};