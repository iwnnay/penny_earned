class ChangeDatetimeToDateOnMonthlyReviews < ActiveRecord::Migration
  def change
    change_column :monthly_reviews, :date, :date, null: false
  end
end
