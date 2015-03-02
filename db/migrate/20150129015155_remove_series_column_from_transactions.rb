class RemoveSeriesColumnFromTransactions < ActiveRecord::Migration
  def change
    remove_column :transactions, :series
  end
end
