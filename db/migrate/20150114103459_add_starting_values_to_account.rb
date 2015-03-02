class AddStartingValuesToAccount < ActiveRecord::Migration
  def change
    add_column :accounts, :staring_amount, :decimal, precision: 20, scale: 2, default: 0.00
    add_column :accounts, :starting_date, :timestamp, null: false
  end
end
