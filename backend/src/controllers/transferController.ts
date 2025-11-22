import { Request, Response } from 'express';
import knex from '../database/connection';

export const createTransfer = async (req: Request, res: Response) => {
    const { productId, sourceWarehouseId, destinationWarehouseId, quantity } = req.body;

    if (!productId || !sourceWarehouseId || !destinationWarehouseId || !quantity) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (sourceWarehouseId === destinationWarehouseId) {
        return res.status(400).json({ error: 'El depósito de origen y destino no pueden ser el mismo.' });
    }

    try {
        // knex.transaction() nos da un objeto 'trx' para hacer todas las operaciones.
        // Si algo falla dentro de la función, 'trx' revierte todos los cambios (rollback).
        // Si todo sale bien, confirma todos los cambios (commit).
        const result = await knex.transaction(async (trx) => {
            // 1. Verificar que hay stock suficiente en el origen
            const sourceStock = await trx('stock').where({
                product_id: productId,
                warehouse_id: sourceWarehouseId
            }).first();

            if (!sourceStock || sourceStock.quantity < quantity) {
                // Al lanzar un error, la transacción se revierte automáticamente.
                throw new Error('Stock insuficiente en el depósito de origen.');
            }

            // 2. Restar stock del origen
            await trx('stock')
                .where('id', sourceStock.id)
                .decrement('quantity', quantity);

            // 3. Sumar stock al destino (lógica de "upsert")
            const destinationStock = await trx('stock').where({
                product_id: productId,
                warehouse_id: destinationWarehouseId
            }).first();

            if (destinationStock) {
                // Si ya existe, sumar a la cantidad
                await trx('stock')
                    .where('id', destinationStock.id)
                    .increment('quantity', quantity);
            } else {
                // Si no existe, crear la nueva entrada de stock
                await trx('stock').insert({
                    product_id: productId,
                    warehouse_id: destinationWarehouseId,
                    quantity: quantity
                });
            }

            // Opcional: Podríamos registrar la transferencia en una tabla 'transfers' aquí.

            return { success: true, message: 'Transferencia completada exitosamente.' };
        });

        res.status(200).json(result);

    } catch (error: any) {
        // El error lanzado dentro de la transacción se captura aquí.
        res.status(400).json({ error: error.message });
    }
};