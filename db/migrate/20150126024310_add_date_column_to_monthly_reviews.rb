class AddDateColumnToMonthlyReviews < ActiveRecord::Migration
  def change
    add_column :monthly_reviews, :date, :timestamp, null: false
  end
end
