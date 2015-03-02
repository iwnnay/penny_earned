require 'rails_helper'

RSpec.describe Recurrence, :type => :model do
  let(:t) do
    @transaction ||= FactoryGirl.create :transaction, recurrence: r
  end

  let(:r) do
    @recurrence ||= FactoryGirl.create :recurrence, timeframe: '1.months'
  end

  describe 'validations' do
    it { should validate_inclusion_of(:timeframe).in_array(Recurrence::TIMEFRAMES) }
    it { should validate_presence_of(:timeframe) }
    it { should validate_presence_of(:original_date) }
  end

  describe '#generate_forward' do
    it 'should generate forward by taking a Transaction' do
      expect{Recurrence.generate_forward(t)}.to change{Transaction.count}
        .by(MonthlyReview::FUTURE_MONTHS)
    end

    it 'should generate forward by taking an Account' do
      expect{Recurrence.generate_forward(t.account)}.to change{Transaction.count}
        .by(MonthlyReview::FUTURE_MONTHS)
    end
  end
end
