import { Request, Response } from 'express';
import knex from '../database/connection';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // 1. Totales Generales (Ventas y Cantidad de Órdenes)
        const totals = await knex('sales')
            .sum('total as totalSales')
            .count('id as totalOrders')
            .first();

        // 2. Total de Productos Vendidos (sumando las cantidades de los detalles)
        const productsCount = await knex('sale_details')
            .sum('quantity as totalUnits')
            .first();

        // 3. Top 5 Productos más vendidos
        const topProducts = await knex('sale_details')
            .join('products', 'sale_details.product_id', 'products.id')
            .select('products.name')
            .sum('sale_details.quantity as quantity')
            .sum('sale_details.subtotal as sales')
            .groupBy('products.name')
            .orderBy('quantity', 'desc') // Ordenamos por cantidad vendida
            .limit(5);

        // 4. Ventas por Depósito
        // Asumiendo que la tabla sales tiene warehouse_id
        // Si no lo tiene directo, habría que ver cómo lo relacionaste, 
        // pero generalmente la venta sale de un depósito.
        const byWarehouse = await knex('sales')
            .join('warehouses', 'sales.warehouse_id', 'warehouses.id')
            .select('warehouses.name', 'warehouses.id')
            .count('sales.id as orders')
            .sum('sales.total as sales')
            .groupBy('warehouses.id', 'warehouses.name');

        res.json({
            totalSales: totals?.totalSales || 0,
            totalOrders: totals?.totalOrders || 0,
            totalProducts: productsCount?.totalUnits || 0,
            topProducts,
            byWarehouse
        });

    } catch (error) {
        console.error("Error reportes:", error);
        res.status(500).json({ error: "Error al generar reporte" });
    }
};