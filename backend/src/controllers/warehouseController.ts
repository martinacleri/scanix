import { Request, Response } from 'express';
import knex from '../database/connection';

// Crear un nuevo warehouse
export const createWarehouse = async (req: Request, res: Response) => {
    const { name, location } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El campo nombre es obligatorio.' });
    }
    try {
        const [newWarehouse] = await knex('warehouses').insert({ name, location }).returning('*');
        res.status(201).json(newWarehouse);
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: `El depósito '${name}' ya existe.` });
        }
        res.status(500).json({ error: 'Ocurrió un error al crear el depósito.' });
    }
};

// Obtener todos los warehouses
export const getAllWarehouses = async (req: Request, res: Response) => {
    try {
        const warehouses = await knex('warehouses').select('*');
        res.status(200).json(warehouses);
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al obtener los depósitos.' });
    }
};

// Obtener un warehouse por ID
export const getWarehouseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const warehouse = await knex('warehouses').where({ id }).first();
        if (!warehouse) {
            return res.status(404).json({ error: 'Depósito no encontrado.' });
        }
        res.status(200).json(warehouse);
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al obtener el depósito.' });
    }
};

// Actualizar un warehouse
export const updateWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, location } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El campo nombre es obligatorio.' });
    }
    try {
        const [updatedWarehouse] = await knex('warehouses')
            .where({ id })
            .update({ name, location, updated_at: new Date() })
            .returning('*');
        if (!updatedWarehouse) {
            return res.status(404).json({ error: 'Depósito no encontrado.' });
        }
        res.status(200).json(updatedWarehouse);
    } catch (error: any) {
         if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: `El depósito '${name}' ya existe.` });
        }
        res.status(500).json({ error: 'Ocurrió un error al actualizar el depósito.' });
    }
};

// Eliminar un warehouse
export const deleteWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedRows = await knex('warehouses').where({ id }).del();
        if (deletedRows === 0) {
            return res.status(404).json({ error: 'Depósito no encontrado.' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al eliminar el depósito.' });
    }
};