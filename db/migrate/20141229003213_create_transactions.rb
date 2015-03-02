class CreateTransactions < ActiveRecord::Migration
  def change
    create_table :transactions do |t|
      t.integer :account_id, null: false
      t.decimal :amount, precision: 2, null: false, default: 0
      t.timestamp :date, null: false
      t.string :description, default: ''

      t.string :state, default: 'placeholder'
      t.boolean :debit, default: true

      t.integer :series
      t.integer :transfer_to
      t.integer :transferred_from

      t.timestamps
    end
  end
end
