class RemovePrecisions < ActiveRecord::Migration
  def change
    change_column :accounts, :total, :decimal, precision: 8, scale: 2
    change_column :transactions, :amount, :decimal, precision: 8, scale: 2
  end
end
