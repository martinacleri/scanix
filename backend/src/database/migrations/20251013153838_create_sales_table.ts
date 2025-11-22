import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sales', (table) => {
    table.increments('id').primary();
    table.decimal('total', 10, 2).notNullable();
    table.integer('client_id').unsigned().references('id').inTable('clients').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('sales');
}