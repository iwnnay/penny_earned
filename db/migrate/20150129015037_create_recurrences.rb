class CreateRecurrences < ActiveRecord::Migration
  def change
    create_table :recurrences do |t|
      t.string :timeframe, null: false
      t.boolean :active, default: false

      t.timestamps
    end
  end
end
