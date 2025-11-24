import { Request, Response } from 'express';
import knex from '../database/connection';
import { sendEmail } from '../config/mailer';

interface SaleItem {
    productId: number;
    quantity: number;
    price_per_unit: number;
}

export const createSale = async (req: Request, res: Response) => {
    const { 
        warehouseId, 
        clientDni, 
        clientName, 
        clientSurname, 
        clientEmail, 
        sellerId,
        items 
    } = req.body as { 
        warehouseId: number; 
        clientDni?: string; 
        clientName?: string;
        clientSurname?: string; 
        clientEmail?: string;
        sellerId?: number;
        items: SaleItem[]; 
    };

    if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos para registrar la venta (items o depósito).' });
    }

    try {
        const saleResult = await knex.transaction(async (trx) => {
            let clientId: number | null = null;

            // --- 1. GESTIÓN DE CLIENTE ---
            if (clientDni) {
                // Buscamos si el cliente ya existe
                const existingClient = await trx('clients').where({ dni: clientDni }).first();

                if (existingClient) {
                    clientId = existingClient.id;

                    // LÓGICA RESTAURADA: Actualizar email si cambió
                    // Si nos mandan un email y es diferente al que ya tenía, lo actualizamos.
                    if (clientEmail && existingClient.email !== clientEmail) {
                        await trx('clients')
                            .where({ id: existingClient.id })
                            .update({ email: clientEmail });
                    }

                } else {
                    // Si NO existe, validamos obligatorios y lo creamos
                    if (!clientName || !clientSurname) {
                        throw new Error('Para clientes nuevos, Nombre y Apellido son obligatorios.');
                    }

                    const [newClient] = await trx('clients').insert({
                        name: clientName,
                        surname: clientSurname,
                        dni: clientDni,
                        email: clientEmail || null,
                    }).returning('id');
                    
                    // Aseguramos compatibilidad con diferentes drivers de SQL
                    clientId = typeof newClient === 'object' ? newClient.id : newClient; 
                }
            }

            // --- 2. VALIDACIÓN DE STOCK ---
            const productIds = items.map(item => item.productId);
            const productsInCart = await trx('products').whereIn('id', productIds).select('id', 'name');

            const productMap = productsInCart.reduce((map, product) => {
                map[product.id] = product.name;
                return map;
            }, {} as { [key: number]: string });

            const stockErrors: string[] = [];
            
            for (const item of items) {
                const stock = await trx('stock')
                    .where({ product_id: item.productId, warehouse_id: warehouseId })
                    .first();

                if (!stock || stock.quantity < item.quantity) {
                    const productName = productMap[item.productId] || `Producto ID: ${item.productId}`;
                    stockErrors.push(`Stock insuficiente para "${productName}" (disponible: ${stock?.quantity || 0}, pedido: ${item.quantity})`);
                }
            }

            if (stockErrors.length > 0) {
                throw new Error(stockErrors.join('\n'));
            }
            
            // --- 3. CREAR VENTA ---
            const totalSale = items.reduce((sum, item) => sum + (item.quantity * item.price_per_unit), 0);

            // Guardamos la venta con los detalles de auditoría (quién y dónde)
            const [saleId] = await trx('sales').insert({
                total: totalSale,
                client_id: clientId,
                warehouse_id: warehouseId,
                user_id: sellerId || null
            }).returning('id');
            
            const realSaleId = typeof saleId === 'object' ? saleId.id : saleId;

            // --- 4. DETALLES Y DESCUENTO DE STOCK ---
            for (const item of items) {
                // Descontar stock
                await trx('stock')
                    .where({ product_id: item.productId, warehouse_id: warehouseId })
                    .decrement('quantity', item.quantity);
              
                // Guardar detalle
                await trx('sale_details').insert({
                    sale_id: realSaleId,
                    product_id: item.productId,
                    quantity: item.quantity,
                    price_per_unit: item.price_per_unit
                });
            }
            
            // Devolvemos el ID para generar el ticket en el frontend
            return { id: realSaleId, total: totalSale };
        });
        
        res.status(201).json({ message: 'Venta registrada exitosamente', sale: saleResult });

    } catch (error: any) {
        console.error("Error en transacción:", error);
        res.status(400).json({ error: error.message || 'Error al procesar la venta' });
    }
};

// --- FUNCIÓN PARA ENVIAR TICKET ---
export const sendTicketEmail = async (req: Request, res: Response) => {
    const { saleId, email } = req.body;

    if (!saleId || !email) {
        return res.status(400).json({ error: 'Faltan datos (saleId o email)' });
    }

    try {
        const sale = await knex('sales')
            .join('sale_details', 'sales.id', 'sale_details.sale_id')
            .join('products', 'sale_details.product_id', 'products.id')
            .select(
                'sales.id as sale_id',
                'sales.total',
                'sales.created_at',
                'products.name as product_name',
                'products.price as list_price', 
                'sale_details.quantity',
                'sale_details.price_per_unit',
                'sale_details.subtotal'
            )
            .where('sales.id', saleId);

        if (!sale || sale.length === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const saleData = sale[0];
        const date = new Date(saleData.created_at).toLocaleString('es-ES');
        
        let calculatedSubtotal = 0;
        let calculatedSavings = 0;

        const itemsHtml = sale.map((item: any) => {
            const lineSoldTotal = item.subtotal || (item.quantity * item.price_per_unit);
            const lineListTotal = item.quantity * item.list_price;
            
            calculatedSubtotal += lineListTotal;
            calculatedSavings += (lineListTotal - lineSoldTotal);

            return `
            <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.product_name}</td>
                <td style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${item.quantity}</td>
                <td style="padding: 12px 20px; border-bottom: 1px solid #e5e7eb; text-align: right; white-space: nowrap; color: #374151;">$${item.price_per_unit}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; white-space: nowrap; color: #111827;">$${lineSoldTotal}</td>
            </tr>
        `}).join('');

        const savingsRow = calculatedSavings > 0 ? `
            <tr>
                <td style="padding: 8px; padding-top: 15px; font-weight: bold; color: #10b981;">Descuentos:</td>
                <td colspan="2"></td>
                <td style="padding: 8px; padding-top: 15px; text-align: right; color: #10b981; font-weight: bold;">-$${calculatedSavings.toFixed(2)}</td>
            </tr>
        ` : '';

        // --- AQUÍ ESTÁ EL CAMBIO DE COLOR ---
        // Usamos un azul/celeste estándar de UI (#3b82f6) para el header y bordes
        const primaryColor = "#3b82f6"; 

        const htmlContent = `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                
                <!-- Header con Color Celeste -->
                <div style="background-color: ${primaryColor}; padding: 30px 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; letter-spacing: 1px; font-size: 24px;">SCANIX</h2>
                    <p style="color: #eff6ff; margin: 5px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9;">Comprobante Digital</p>
                </div>
                
                <div style="padding: 30px;">
                    <p style="color: #4b5563; margin-bottom: 20px;">Hola,</p>
                    <p style="color: #4b5563; line-height: 1.5;">Te enviamos el detalle de tu compra realizada el <strong>${date}</strong>.</p>
                    
                    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #bae6fd;">
                        <span style="color: #0369a1; font-size: 11px; text-transform: uppercase; font-weight: bold;">N° de Ticket</span>
                        <div style="color: #0c4a6e; font-size: 18px; font-weight: bold; margin-top: 5px;">#${saleData.sale_id}</div>
                    </div>

                    <!-- Tabla Productos -->
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid ${primaryColor};">
                                <th style="padding: 10px 8px; text-align: left; color: ${primaryColor}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Producto</th>
                                <th style="padding: 10px 20px; text-align: center; color: ${primaryColor}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Cant.</th>
                                <th style="padding: 10px 20px; text-align: right; color: ${primaryColor}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">P. Unit.</th>
                                <th style="padding: 10px 8px; text-align: right; color: ${primaryColor}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Subt.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <!-- Resumen de Cuenta -->
                    <div style="margin-top: 20px; border-top: 2px solid #f3f4f6;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold; color: #6b7280;">Subtotal:</td>
                                <td colspan="2"></td>
                                <td style="padding: 8px; text-align: right; color: #6b7280;">$${calculatedSubtotal.toFixed(2)}</td>
                            </tr>
                            ${savingsRow}
                            <tr>
                                <td style="padding: 15px 8px; font-weight: 900; font-size: 18px; color: #111827;">TOTAL:</td>
                                <td colspan="2"></td>
                                <td style="padding: 15px 8px; text-align: right; font-weight: 900; font-size: 18px; color: ${primaryColor};">$${saleData.total}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                        Gracias por confiar en nosotros.<br>
                        SCANIX - Sistema de Ventas Inteligente
                    </p>
                </div>
            </div>
        `;

        await sendEmail(email, `Tu Ticket de Compra #${saleId}`, htmlContent);

        res.json({ message: 'Email enviado correctamente' });

    } catch (error: any) {
        console.error("Error enviando mail:", error);
        res.status(500).json({ error: 'Error al enviar el email' });
    }
};