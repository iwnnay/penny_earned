require 'rails_helper'

RSpec.describe MonthlyReview, :type => :model do
  describe '#generate_for' do
    def create_account
      @account ||= FactoryGirl.create :account
    end

    it "should create a review for the next #{MonthlyReview::FUTURE_MONTHS} months" do
      expect do
        create_account
      end.to(change{MonthlyReview.count}.by(MonthlyReview::FUTURE_MONTHS))
    end

    it "should not duplicate reviews" do
      account = create_account
      expect do
        MonthlyReview.generate_for account
      end.to_not change{MonthlyReview.count}
    end

    it 'should generate one more record next month' do
      account = create_account
      date = Time.now + 1.months - 1.days
      allow(Time).to receive(:now).and_return(date.beginning_of_month)
      expect do
        MonthlyReview.generate_for account
      end.to change{MonthlyReview.count}.from(24).to(25)
    end

    it "should create enough records to be #{MonthlyReview::FUTURE_MONTHS} from now" do
      expect do
        FactoryGirl.create :account, starting_date: 3.months.ago
      end.to change{MonthlyReview.count}.by(MonthlyReview::FUTURE_MONTHS + 3)
    end
  end

  describe '#calulcate_totals' do
    let(:account) do
      @account ||= FactoryGirl.create :account
    end

    it 'should only use it\'s transactions' do
      transaction = FactoryGirl.create(:transaction, state: 'paid')
      account.transactions << transaction
      account.transactions << FactoryGirl
        .create(:transaction, date: 3.months.from_now)

      expect(account.monthly_reviews.at(Time.now).first
             .transactions.count).to eq(1)
    end

    it 'should put paid status to banked total' do
      account.transactions << transaction = FactoryGirl.create(:transaction, state: 'paid')

      total = account.starting_amount - transaction.amount
      review = account.monthly_reviews.at(Time.now).first

      review.calculate_totals

      expect(MonthlyReview.find(review.id).banked_total).to eq(total)
    end

    it 'should put other statuses in estimated' do
      account.transactions << transaction = FactoryGirl.create(:transaction)
      account.transactions << transaction1 = FactoryGirl
        .create(:transaction, debit: false, amount: 420)
      account.transactions << transaction2 = FactoryGirl.create(:transaction)

      total = account.starting_amount - transaction.amount +
        transaction1.amount - transaction2.amount
      review = account.monthly_reviews.at(Time.now).first

      review.calculate_totals

      expect(review.estimated_total).to eq(total)
    end

    it 'should use the previous month as it\'s start amount' do
      prev = account.review_for(Time.now + 2.months)
      prev.update_attribute :banked_total, 444.90

      rev = account.review_for(Time.now + 3.months)

      account.transactions << t = FactoryGirl.create(:transaction,
        date: Time.now + 3.months, state: 'paid')

      total = prev.banked_total - t.amount
      rev.calculate_totals
      expect(rev.banked_total).to eq(total)
    end

    it 'should add amounts that are paid and not debits to banked_total' do
      account.transactions << transaction = FactoryGirl
        .create(:transaction, debit: false, state: 'paid')

      review = account.monthly_reviews.at(Time.now).first
      review.calculate_totals

      expected = account.starting_amount + transaction.amount

      expect(review.banked_total).to eq(expected)
    end
  end

  describe '#is_in_future?' do

    let(:account) do
      @account ||= FactoryGirl.create :account, starting_date: 2.months.ago
    end

    it 'should return true if month is occurring or will occur' do
      expect(account.monthly_reviews.at(1.month.from_now).first.is_in_future?)
        .to be(true)
    end

    it 'should return false if it\'s a past review' do
      expect(account.monthly_reviews.first.is_in_future?).to be(false)
    end
  end

  describe '#min' do
    let(:account) do
      @account ||= FactoryGirl.create :account
    end

    it 'should find the minimum transaction' do
      MonthlyReview.generate_for account

      mr = account.monthly_reviews[2]
      account.transactions << (expected = FactoryGirl.create(:transaction,
        amount: 400, date: mr.date + 2.days))
      account.transactions << FactoryGirl.create(:transaction, amount: 600,
        debit: false, date: mr.date + 3.days)

      expect(mr.min.id).to eq(expected.id)
    end
  end

  describe '#max' do
    let(:account) do
      @account ||= FactoryGirl.create :account
    end

    it 'should find the maximum transaction' do
      MonthlyReview.generate_for account

      mr = account.monthly_reviews[2]
      account.transactions << (FactoryGirl.create(:transaction,
        amount: 400, date: mr.date + 2.days))
      account.transactions << (expected = FactoryGirl.create(:transaction,
        amount: 600, debit: false, date: mr.date + 3.days))

      expect(mr.max.id).to eq(expected.id)
    end
  end
end
