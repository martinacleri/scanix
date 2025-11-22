import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    // Añadimos la nueva columna después de 'price'
    table.string('image_url').nullable().after('price');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    table.dropColumn('image_url');
  });
}