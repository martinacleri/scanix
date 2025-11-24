import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('sales', (table) => {
    // Agregamos las referencias a depósitos y usuarios (operarios)
    table.integer('warehouse_id').unsigned().references('id').inTable('warehouses').nullable();
    table.integer('user_id').unsigned().references('id').inTable('users').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('sales', (table) => {
    table.dropColumn('warehouse_id');
    table.dropColumn('user_id');
  });
}