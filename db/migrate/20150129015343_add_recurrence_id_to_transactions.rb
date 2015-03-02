class AddRecurrenceIdToTransactions < ActiveRecord::Migration
  def change
    add_column :transactions, :recurrence_id, :integer
  end
end
