class AddDatesToExistingRecords < ActiveRecord::Migration
  def up
    MonthlyReview.where(date: nil).each do |mr|
      raise 'could not update' unless mr.update_attribute(:date, Time.new(mr.year, mr.month))
    end
  end
  def down
  end
end
