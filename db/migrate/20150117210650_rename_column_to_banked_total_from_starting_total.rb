class RenameColumnToBankedTotalFromStartingTotal < ActiveRecord::Migration
  def change
    rename_column :monthly_reviews, :starting_total, :banked_total
  end
end
