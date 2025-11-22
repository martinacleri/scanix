import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    // Creamos la columna para el ID de la categoría
    table.integer('category_id').unsigned().nullable();

    // Creamos la relación (llave foránea)
    table.foreign('category_id')
         .references('id')
         .inTable('categories')
         .onDelete('SET NULL'); // Si se borra una categoría, el producto queda sin categoría
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('products', (table) => {
    table.dropForeign('category_id');
    table.dropColumn('category_id');
  });
}