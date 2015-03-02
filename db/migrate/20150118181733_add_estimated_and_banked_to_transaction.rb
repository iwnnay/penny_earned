class AddEstimatedAndBankedToTransaction < ActiveRecord::Migration
  def change
    add_column :transactions, :banked, :decimal, precision: 10, scale: 2
    add_column :transactions, :estimated, :decimal, precision: 10, scale: 2
  end
end
