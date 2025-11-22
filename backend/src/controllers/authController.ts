import { Request, Response } from 'express';
import knex from '../database/connection';

export const register = async (req: Request, res: Response) => {
    // Ahora esperamos dni, name, surname
    const { dni, name, surname, password, warehouse_id } = req.body;

    if (!dni || !name || !surname || !password || !warehouse_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        const existingUser = await knex('users').where({ dni }).first();
        if (existingUser) {
            return res.status(400).json({ error: 'Ya existe un usuario con este DNI.' });
        }

        const [newUser] = await knex('users').insert({
            dni,
            name,
            surname,
            password, 
            warehouse_id
        }).returning('*');

        res.status(201).json({ message: 'Operario registrado con éxito', user: newUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario.' });
    }
};

export const login = async (req: Request, res: Response) => {
    // El login ahora es con dni y password
    const { dni, password } = req.body;

    try {
        const user = await knex('users')
            .join('warehouses', 'users.warehouse_id', 'warehouses.id')
            .select('users.*', 'warehouses.name as warehouse_name')
            .where({ 'users.dni': dni, 'users.password': password })
            .first();

        if (!user) {
            return res.status(401).json({ error: 'DNI o contraseña incorrectos.' });
        }

        res.json({
            name: user.name,
            surname: user.surname,
            dni: user.dni,
            role: "Operario",
            warehouseId: user.warehouse_id,
            warehouseName: user.warehouse_name
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
};