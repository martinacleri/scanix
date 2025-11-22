import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('dni').notNullable().unique(); // El DNI será el nuevo "usuario"
    table.string('name').notNullable();
    table.string('surname').notNullable();  
    table.string('password').notNullable(); // Para el TP lo guardamos así, en la vida real se encripta
    table.integer('warehouse_id').unsigned().notNullable()
         .references('id').inTable('warehouses').onDelete('CASCADE');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}

