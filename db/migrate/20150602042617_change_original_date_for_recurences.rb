class ChangeOriginalDateForRecurences < ActiveRecord::Migration
  def change
    change_column :recurrences, :original_date, :date
  end
end
