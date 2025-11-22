import { Request, Response } from 'express';
import knex from '../database/connection';

export const getAllCategories = async (req: Request, res: Response) => {
    try {
    const categories = await knex('categories').select('*');
    res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al obtener las categorías.' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'El campo nombre es obligatorio.' });
    }

    try {
        const [newCategory] = await knex('categories').insert({ name }).returning('*');
        res.status(201).json(newCategory);
    } catch (error: any) {
        // Maneja el error en caso de que la categoría ya exista (por la restricción 'unique')
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: `La categoría '${name}' ya existe.` });
        }
        res.status(500).json({ error: 'Ocurrió un error al crear la categoría.' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // .del() devuelve el número de filas eliminadas
        const deletedRows = await knex('categories').where({ id }).del();

        if (deletedRows === 0) {
            // Si no se eliminó ninguna fila, la categoría no existía
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        // El código 204 "No Content" es la respuesta estándar para un DELETE exitoso.
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Ocurrió un error al eliminar la categoría.' });
    }
};