import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('sale_details', (table) => {
    table.decimal('subtotal', 10, 2).nullable(); // Agregamos la columna subtotal
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('sale_details', (table) => {
    table.dropColumn('subtotal');
  });
}