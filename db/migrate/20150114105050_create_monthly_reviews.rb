class CreateMonthlyReviews < ActiveRecord::Migration
  def change
    create_table :monthly_reviews do |t|
      t.integer :account_id, null: false
      t.integer :month, null: false
      t.integer :year, null: false
      t.decimal :starting_total, precision: 20, scale: 2, null: false
      t.decimal :estimated_total, precision: 20, scale: 2, null: false

      t.timestamps
    end
  end
end
