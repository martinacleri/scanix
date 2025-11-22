import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('price_rules', (table) => {
    table.increments('id').primary();
    
    // La regla pertenece a un producto. Si el producto se borra, sus reglas también.
    table.integer('product_id').unsigned().notNullable()
         .references('id').inTable('products').onDelete('CASCADE');

    table.integer('min_quantity').unsigned().notNullable();
    // max_quantity puede ser nulo para representar "o más"
    table.integer('max_quantity').unsigned().nullable(); 
    table.decimal('price', 10, 2).notNullable();

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('price_rules');
}