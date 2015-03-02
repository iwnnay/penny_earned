class AddOriginalDateAndRemoveActiveFromRecurrence < ActiveRecord::Migration
  def up
    add_column :recurrences, :original_date, :datetime
  end

  def down
    remove_column :recurrences, :original_date, :datetime
  end
end
