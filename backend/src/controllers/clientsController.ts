import { Request, Response } from 'express';
import knex from '../database/connection';

export const getClientByDni = async (req: Request, res: Response) => {
    const { dni } = req.params;
    try {
        const client = await knex('clients').where({ dni }).first();
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el cliente.' });
    }
};