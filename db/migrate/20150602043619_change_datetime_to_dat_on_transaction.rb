class ChangeDatetimeToDatOnTransaction < ActiveRecord::Migration
  def change
    change_column :transactions, :date, :date
  end
end
