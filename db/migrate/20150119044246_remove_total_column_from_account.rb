class RemoveTotalColumnFromAccount < ActiveRecord::Migration
  def change
    remove_column :accounts, :total
  end
end
