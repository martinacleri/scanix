import knex from 'knex';
import config from 'backend/../../knexfile';

// Usamos la configuración de 'development' del knexfile
const connection = knex(config.development);

export default connection;