class CreateAccounts < ActiveRecord::Migration
  def change
    create_table :accounts do |t|
      t.integer :user_id, null: false
      t.string :type_of, null: false
      t.string :name, null: false
      t.decimal :total, precision: 2, default: 0, null: false

      t.timestamps
    end
  end
end
