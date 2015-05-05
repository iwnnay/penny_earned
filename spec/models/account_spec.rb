require 'rails_helper'

RSpec.describe Account, :type => :model do
  it { should have_db_column(:type_of).of_type(:string) }
  it { should have_db_column(:name).of_type(:string) }
  it { should have_db_column(:user_id).of_type(:integer)}

  it { should belong_to(:user) }
  it { should have_many(:transactions) }

  it { should validate_presence_of(:user_id) }
  it { should validate_presence_of(:type_of) }
  it { should validate_presence_of(:name) }
  it { should validate_inclusion_of(:type_of).in_array(Account::TYPES) }

  describe 'defaults' do
    describe 'for total' do
      it 'should be set the total to starting amount' do
        a = FactoryGirl.create(:account)
        expect(Account.first.total).to eq(a.starting_amount)
      end
    end
  end

  describe 'scopes' do
    it 'should be able to find a review if passed a time and month' do
      @account = FactoryGirl.create :account
      time = 3.months.from_now
      expected  = MonthlyReview.where month: time.month, year: time.year

      expect(@account.review_for(time)).to eq(expected.first)

    end
  end

  describe '#create_reviews' do
    it 'should create account and reviews for so many months' do
      expect do
        FactoryGirl.create :account
      end.to change{MonthlyReview.count}.by(MonthlyReview::FUTURE_MONTHS)
    end
  end

  describe '#calculate_range' do
    it 'should run calculate_totals for future reviews' do
      @account = FactoryGirl.create :account
      @account.transactions << FactoryGirl.create(:transaction)
      @account.transactions << FactoryGirl.create(:transaction, date: 1.months.from_now)
      @account.transactions << FactoryGirl.create(:transaction, date: 2.months.from_now)

      bef = @account.monthly_reviews.at(1.months.from_now).first
      t_bef = bef.estimated_total
      aft = @account.monthly_reviews.at(2.months.from_now).first
      t_aft = aft.estimated_total

      @account.calculate_range(1.months.from_now)

      expect(bef.banked_total).to eq(t_bef)
      expect(aft.reload.estimated_total).to be < t_aft
    end
  end

  describe 'min and maxes' do
    before(:each) do
      @account = FactoryGirl.create :account
      MonthlyReview.generate_for @account

      FactoryGirl.create(:transaction,
        description: 'min', amount: 200.00, account: @account,
          date: Time.now + 1.months)
      FactoryGirl.create(:transaction,
        description: 'max', amount: 200.00, debit: false,
        date: Time.now + 2.months, account: @account)

      @account.calculate_range(Time.now - 1.months)
    end

    it 'should find the min of all the monthly reviews' do
      expect(@account.min_review.id).to eq(
        MonthlyReview.at(Time.now + 1.months).first.id)
    end

    it 'should find the max of all the monthly reviews' do
      expect(@account.max_review.id).to eq(MonthlyReview
        .at(Time.now + 2.months).first.id)
    end

    it 'should find the min amount of all transactions' do
      expect(@account.min).to eq(Transaction.first.estimated)
    end

    it 'should find the max amount of all transactions' do
      expect(@account.max).to eq(Transaction.last.estimated)
    end
  end

end
