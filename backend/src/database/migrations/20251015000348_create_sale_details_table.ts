import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sale_details', (table) => {
    table.increments('id').primary();
    table.integer('sale_id').unsigned().notNullable().references('id').inTable('sales').onDelete('CASCADE');
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('quantity').unsigned().notNullable();
    table.decimal('price_per_unit', 10, 2).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('sale_details');
}