import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./data/database.sqlite3" // Ruta a nuestro archivo de BD
    },
    useNullAsDefault: true,
    migrations: {
      directory: './src/database/migrations' // Dónde guardaremos las migraciones
    }
  },
};

export default config;