import { Request, Response } from 'express';
import knex from '../database/connection';

// Obtener todos los productos
export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const products = await knex('products').select('*');
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al obtener los productos.' });
    }
};

// Crear un nuevo producto
export const createProduct = async (req: Request, res: Response) => {
    // Obtenemos los datos del cuerpo de la petición
    const { name, description, sku, price, category_id, priceRules } = req.body;
    // La información del archivo viene en req.file gracias a Multer
    const imageFile = req.file;

    // Validación básica
    if (!name || !sku || !price) {
        return res.status(400).json({ error: 'Los campos nombre, SKU y precio son obligatorios.' });
    }

    // Construimos la URL de la imagen para guardarla en la BD
    const image_url = imageFile ? `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}` : null;

    try {
        const newProduct = await knex.transaction(async (trx) => {
            const productData = {
                name,
                description,
                sku,
                // price viene como string de un form-data, lo convertimos a número
                price: parseFloat(price), 
                category_id: category_id ? parseInt(category_id) : null,
                image_url, // Guardamos la URL de la imagen 
            };

        // Insertamos en la base de datos y le pedimos que nos devuelva el producto creado
        const [createdProduct] = await trx('products').insert(productData).returning('*');

        // Si hay reglas de precio, las insertamos
        if (priceRules && Array.isArray(priceRules) && priceRules.length > 0) {
                const rulesToInsert = priceRules.map((rule: any) => ({
                    product_id: createdProduct.id,
                    min_quantity: parseInt(rule.from),
                    max_quantity: parseInt(rule.to),
                    price: parseFloat(rule.price)
                }));
                await trx('price_rules').insert(rulesToInsert);
            }

            return createdProduct;
        });

        res.status(201).json(newProduct);
    } catch (error: any) {
        // Manejo de error específico por si el SKU ya existe (error de unicidad)
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: `El SKU '${sku}' ya existe.` });
        }
        res.status(500).json({ error: 'Ocurrió un error al crear el producto.' });
    }
};

// Obtener un producto por su ID
export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params; // Obtenemos el ID de los parámetros de la URL

    try {
        // Buscamos en la tabla 'products' donde el id coincida, y seleccionamos el primero
        const product = await knex('products').where({ id }).first();

        if (!product) {
            // Si no se encuentra el producto, devolvemos un error 404
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al obtener el producto.' });
    }
};

// Actualizar un producto existente (con reglas de precio)
export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    // Ahora esperamos un array 'priceRules' en el body, que puede venir como string
    const { name, sku, price, description, category_id, priceRules: priceRulesString } = req.body;
    const imageFile = req.file;

    // Validación básica de los datos principales
    if (!name || !sku || !price) {
        return res.status(400).json({ error: 'Los campos nombre, SKU y precio son obligatorios.' });
    }

    try {
        // Usamos una transacción para asegurar que todas las operaciones se completen con éxito
        const updatedProduct = await knex.transaction(async (trx) => {
            
            // Preparamos los datos del producto principal
            const productDataToUpdate: { [key: string]: any } = {
                name,
                sku,
                price: parseFloat(price),
                description,
                category_id: category_id ? parseInt(category_id) : null,
                updated_at: new Date()
            };

            // Si el usuario subió una nueva imagen, la actualizamos
            if (imageFile) {
                productDataToUpdate.image_url = `${req.protocol}://${req.get('host')}/uploads/${imageFile.filename}`;
            }

            // Actualizamos el registro en la tabla 'products'
            const [product] = await trx('products').where({ id }).update(productDataToUpdate).returning('*');

            if (!product) {
                // Si el producto no se encuentra, lanzamos un error para revertir la transacción
                throw new Error('Producto no encontrado.');
            }

            // Borramos TODAS las reglas de precio antiguas asociadas a este producto
            await trx('price_rules').where({ product_id: id }).del();

            // Si se enviaron nuevas reglas de precio, las insertamos
            if (priceRulesString) {
                // Como los datos vienen de FormData, priceRules es un string JSON. Hay que parsearlo.
                const priceRules = JSON.parse(priceRulesString);

                if (Array.isArray(priceRules) && priceRules.length > 0) {
                    const rulesToInsert = priceRules.map((rule: any) => ({
                        product_id: product.id,
                        min_quantity: parseInt(rule.from),
                        max_quantity: parseInt(rule.to),
                        price: parseFloat(rule.price)
                    }));
                    await trx('price_rules').insert(rulesToInsert);
                }
            }
            
            // Si todo fue bien, la transacción devuelve el producto actualizado
            return product;
        });
        
        // Si la transacción se completó, enviamos la respuesta
        res.status(200).json(updatedProduct);

    } catch (error: any) {
        // Si algo falló dentro de la transacción, se captura el error aquí
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: `El SKU '${sku}' ya existe.` });
        }
        res.status(400).json({ error: error.message || 'Ocurrió un error al actualizar el producto.' });
    }
};

// Eliminar un producto
export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // .del() devuelve el número de filas eliminadas
        const deletedRows = await knex('products').where({ id }).del();

        if (deletedRows === 0) {
            // Si no se eliminó ninguna fila, el producto no existía
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // El código 204 significa "No Content" (Sin Contenido).
        // Es el estándar para respuestas de eliminación exitosas.
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al eliminar el producto.' });
    }
};

// Obtener productos con detalles (stock total)
export const getProductsWithDetails = async (req: Request, res: Response) => {
    try {
        // Obtenemos todos los productos y su stock total
        const products = await knex('products')
            .leftJoin('stock', 'products.id', 'stock.product_id')
            .leftJoin('categories', 'products.category_id', 'categories.id')
            .select(
                'products.*',
                'categories.name as category_name',
                knex.raw('COALESCE(SUM(stock.quantity), 0) as totalStock')
            )
            .groupBy('products.id');

        if (products.length === 0) {
            return res.status(200).json([]);
        }

        // Obtenemos los IDs de los productos que encontramos.
        const productIds = products.map(p => p.id);

        // Buscamos TODAS las reglas de precio para esos productos en una sola consulta.
        const allPriceRules = await knex('price_rules')
            .whereIn('product_id', productIds)
            .select('*');

        // Mapeamos las reglas a cada producto para un acceso fácil.
        const productsWithRules = products.map(product => {
            const rulesForThisProduct = allPriceRules.filter(
                rule => rule.product_id === product.id
            );
            return {
                ...product,
                priceRules: rulesForThisProduct // Añadimos el array de reglas al producto
            };
        });

        res.status(200).json(productsWithRules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los productos con detalles.' });
    }
};