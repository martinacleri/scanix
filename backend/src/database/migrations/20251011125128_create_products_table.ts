import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('description').nullable();
    table.string('sku').unique();
    table.decimal('price', 10, 2).notNullable(); // Precio base del producto
    table.timestamps(true, true); // Crea las columnas created_at y updated_at
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('products');
}