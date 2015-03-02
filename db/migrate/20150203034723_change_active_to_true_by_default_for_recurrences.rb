class ChangeActiveToTrueByDefaultForRecurrences < ActiveRecord::Migration
  def change
    change_column_default :recurrences, :active, true
  end
end
