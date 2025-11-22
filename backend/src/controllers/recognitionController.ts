import { Request, Response } from 'express';
import knex from '../database/connection';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export const recognizeProduct = async (req: Request, res: Response) => {
    console.log("!!! PETICIÓN RECIBIDA EN NODE.JS !!!");
    console.log("Archivo recibido:", req.file);
    const imageFile = req.file;

    if (!imageFile) {
        return res.status(400).json({ error: 'No se subió ninguna imagen.' });
    }

    try {
        // 1. Preparamos la imagen para enviarla al servidor de Python
        const formData = new FormData();
        // Leemos el archivo que Multer guardó temporalmente y lo adjuntamos
        const filePath = path.resolve(imageFile.path);
        formData.append('photo', fs.createReadStream(filePath));

        // 2. Llamamos al Microservicio de IA (Python) en el puerto 5001
        // Importante: Asegurate que server.py esté corriendo en este puerto
        const aiResponse = await axios.post('http://127.0.0.1:5001/recognize', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        const aiResults = aiResponse.data; // Esto es el array de objetos que devuelve Python
        console.log("Resultados de IA:", aiResults);

        if (!aiResults || aiResults.length === 0) {
            return res.status(404).json({ error: 'La IA no pudo identificar ningún producto en la imagen.' });
        }

        // 3. Extraemos los SKUs que identificó la IA
        // El servidor python devuelve algo como: [{ sku: 'SAL-001', ... }, { sku: 'MAY-001', ... }]
        const detectedSkus = aiResults.map((item: any) => item.sku);

        // 4. Buscamos esos productos en NUESTRA base de datos
        // Hacemos una consulta completa para obtener categorías, stock y todo lo necesario
        const products = await knex('products')
            .leftJoin('stock', 'products.id', 'stock.product_id')
            .leftJoin('categories', 'products.category_id', 'categories.id')
            .whereIn('products.sku', detectedSkus)
            .select(
                'products.*',
                'categories.name as category_name',
                knex.raw('COALESCE(SUM(stock.quantity), 0) as totalStock')
            )
            .groupBy('products.id');

        if (products.length === 0) {
             // Si la IA vio algo pero nosotros no tenemos ese SKU en la base de datos
             return res.status(404).json({ error: 'Productos detectados por IA no encontrados en el catálogo.' });
        }

        // 5. Agregamos las reglas de precio a cada producto encontrado
        // Esto es vital para que el carrito funcione con los precios por volumen
        const productIds = products.map(p => p.id);
        const allPriceRules = await knex('price_rules').whereIn('product_id', productIds).select('*');

        const productsWithDetails = products.map(product => {
            const rules = allPriceRules.filter(r => r.product_id === product.id);
            return {
                ...product,
                priceRules: rules.map(r => ({
                    from: r.min_quantity,
                    to: r.max_quantity, // Puede ser null
                    price: parseFloat(r.price)
                }))
            };
        });

        // 6. Devolvemos la lista de productos completa al Frontend
        res.status(200).json(productsWithDetails);

    } catch (error: any) {
        console.error("Error en reconocimiento:", error.message);
        
        // Manejo de errores específicos
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'El servicio de Inteligencia Artificial no está respondiendo. Verificá que server.py esté corriendo en el puerto 5001.' 
            });
        }
        
        res.status(500).json({ error: 'Ocurrió un error interno al procesar la imagen.' });
    }
};