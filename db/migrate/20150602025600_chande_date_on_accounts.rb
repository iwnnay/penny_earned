class ChandeDateOnAccounts < ActiveRecord::Migration
  def change
    change_column :accounts, :starting_date, :date, null: false
  end
end
