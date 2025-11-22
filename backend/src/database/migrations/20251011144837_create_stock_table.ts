import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('stock', (table) => {
    table.increments('id').primary();
    table.integer('quantity').unsigned().notNullable().defaultTo(0);

    // Relación con Productos
    table.integer('product_id').unsigned().notNullable()
         .references('id').inTable('products').onDelete('CASCADE');

    // Relación con Depósitos
    table.integer('warehouse_id').unsigned().notNullable()
         .references('id').inTable('warehouses').onDelete('CASCADE');

    // Nos aseguramos de que no pueda haber dos entradas para el mismo producto en el mismo depósito
    table.unique(['product_id', 'warehouse_id']);

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('stock');
}