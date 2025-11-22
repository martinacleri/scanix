import { Request, Response } from 'express';
import knex from '../database/connection';

interface SaleItem {
    productId: number;
    quantity: number;
    price_per_unit: number;
}

export const createSale = async (req: Request, res: Response) => {
    const { warehouseId, clientDni, clientName, clientSurname, items } = req.body as { 
        warehouseId: number; 
        clientDni?: string; 
        clientName?: string;
        clientSurname?: string; 
        items: SaleItem[]; 
    };

    if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos para registrar la venta.' });
    }

    try {
        const saleResult = await knex.transaction(async (trx) => {
            let clientId: number | null = null;

            // Si se proporcionó un DNI y un nombre, intentamos buscar o crear el cliente
            if (clientDni && clientName && clientSurname) {
                const existingClient = await trx('clients').where({ dni: clientDni }).first();

                if (existingClient) {
                    // Si ya existe, usamos su ID
                    clientId = existingClient.id;
                } else {
                    // Si no existe, lo creamos en la tabla 'clients' y usamos su nuevo ID
                    const [newClient] = await trx('clients').insert({
                        name: clientName,
                        surname: clientSurname,
                        dni: clientDni,
                    }).returning('id');
                    clientId = newClient.id; 
                }
            }

            // Obtenemos los IDs de todos los productos del carrito.
            const productIds = items.map(item => item.productId);

            // Buscamos todos esos productos en la BD de una sola vez.
            const productsInCart = await trx('products').whereIn('id', productIds).select('id', 'name');

            // Creamos un "mapa" para buscar nombres fácilmente por ID.
            const productMap = productsInCart.reduce((map, product) => {
                map[product.id] = product.name;
                return map;
            }, {} as { [key: number]: string });

            // Recorremos todos los items para verificar el stock ANTES de hacer cambios.
            const stockErrors: string[] = [];
            for (const item of items) {
                const stock = await trx('stock').where({ product_id: item.productId, warehouse_id: warehouseId }).first();
                if (!stock || stock.quantity < item.quantity) {
                    const productName = productMap[item.productId] || `ID: ${item.productId}`;
                    // Agregamos un mensaje de error a nuestra lista
                    stockErrors.push(`Stock insuficiente para "${productName}" (disponible: ${stock?.quantity || 0}, pedido: ${item.quantity})`);
                }
            }

            // Si encontramos algún error en la lista, detenemos toda la transacción.
            if (stockErrors.length > 0) {
                // Unimos todos los mensajes de error en uno solo, separados por un punto y coma.
                throw new Error(stockErrors.join('\n'));
            }
            
            const totalSale = items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

            // Creamos el registro en 'sales' usando el ID del cliente (existente o nuevo)
            const [sale] = await trx('sales').insert({
                total: totalSale,
                client_id: clientId 
            }).returning('*');

            // El resto de la lógica para procesar los items y el stock
            for (const item of items) {
                await trx('stock')
                    .where({ product_id: item.productId, warehouse_id: warehouseId })
                    .decrement('quantity', item.quantity);
              
                await trx('sale_details').insert({
                    sale_id: sale.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    price_per_unit: item.price_per_unit
                });
            }
            
            return sale;
        });
        
        res.status(201).json({ message: 'Venta registrada exitosamente', sale: saleResult });

    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};