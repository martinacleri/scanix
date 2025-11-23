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

export const getAllClients = async (req: Request, res: Response) => {
    try {
        // Traemos todos los clientes ordenados por nombre
        const clients = await knex('clients').select('*').orderBy('name', 'asc');
        res.status(200).json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes.' });
    }
};