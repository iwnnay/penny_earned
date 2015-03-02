class AddColumnsForMonthlyTotals < ActiveRecord::Migration
  def change
    add_column :monthly_reviews, :credits, :decimal, default: 0.00, precision: 20, scale: 2
    add_column :monthly_reviews, :debits, :decimal, default: 0.00, precision: 20, scale: 2
    add_column :monthly_reviews, :difference, :decimal, default: 0.00, precision: 20, scale: 2
  end
end
