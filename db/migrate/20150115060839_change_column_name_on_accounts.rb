class ChangeColumnNameOnAccounts < ActiveRecord::Migration
  def change
    rename_column :accounts, :staring_amount, :starting_amount
  end
end
