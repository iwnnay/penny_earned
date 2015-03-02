class CreateCategories < ActiveRecord::Migration
  def change
    create_table :categories do |t|
      t.integer :user_id
      t.integer :account_id
      t.string :name

      t.timestamps
    end

    create_table :categories_transactions, id: false do |t|
      t.belongs_to :category, index: true
      t.belongs_to :transaction, index: true
    end
  end
end
