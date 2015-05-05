require 'rails_helper'

RSpec.describe Transaction, :type => :model do
  it { should have_db_column(:amount) }
  it { should have_db_column(:date).with_options(null: false) }
  it { should have_db_column(:recurrence_id) }
  it { should have_db_column(:debit) }
  it { should have_db_column(:description) }
  it { should have_db_column(:transfer_to) }
  it { should have_db_column(:transferred_from) }

  #it { should have_many :categories }
  it { should belong_to(:account) }

  #Need to write these custom
  #it { should validate_presence_of(:account_id) }
  #it { should validate_presence_of(:debit) }
  #it { should validate_inclusion_of(:state).in_array(Transaction::STATES) }

  let(:account) do
    @account ||= FactoryGirl.create :account
  end

  let(:trans) do
    @trans ||= FactoryGirl.create :transaction, account: account
  end

  describe 'validations' do
    it 'should stop a user from creating a transaction before the start date of the parenting account' do
      account = FactoryGirl.create :account
      transaction = FactoryGirl.build :transaction, account: account,
        date: account.starting_date - 1.days

      assert !transaction.save, 'Was able to save'
      assert_equal 'Cannot save transaction before the start of the account',
        transaction.errors[:date][0]
    end
  end

  describe '#save' do
    it 'should need only an account_id to validate' do
      t = Transaction.new(account: account, description: 'This is the only attribute')
      expect(t.save).to eq(true)
    end

    describe 'defaults' do
      before(:each) do
        @transaction = Transaction
          .create(account: account, description: 'This is the only attribute')
      end

      it 'should be a zero for amount' do
        expect(@transaction.amount).to eq(0)
      end

      it 'should be "placeholder" for state' do
        expect(@transaction.state).to eq('placeholder')
      end

      it 'should be true for debit' do
        expect(@transaction.debit).to eq(true)
      end

      it 'should be about now for date' do
        actual = !@transaction.date.nil? && @transaction.date > 5.minutes.ago && @transaction.date < Time.now
        expect(actual).to eq(true)
      end
    end
  end

  describe '#update_categories' do
    it 'should add categories now to a saved transaction' do
      t = FactoryGirl.create :transaction
      t.update_categories(%w{thanks buddy})

      assert_equal 2, Transaction.find(t.id).categories.count
    end

    it 'should add them after save to a new transaction' do
      t = FactoryGirl.build :transaction
      assert t.categories.empty?

      t.update_categories(['bills', 'vacation', 'unexpected'])
      t.save

      assert_equal 3, t.categories.count
    end

    it 'should have added categories with names passed in' do
      t = FactoryGirl.create :transaction
      t.update_categories(%w{thanks buddy})

      cs = t.categories.collect {|cat| cat.name }
      assert cs.include?('thanks')
      assert cs.include?('buddy')
    end

    it 'should delete categories that were not assigned' do
      t = FactoryGirl.create :transaction
      c = FactoryGirl.create :category, name: 'delete me please'

      t.categories << c

      t.update_categories(%w{keep_me love_me})

      assert !t.category_ids.include?(c.id),
        'category is still present'
    end

    it 'should allow you to unset all categories' do
      t = FactoryGirl.create :transaction
      t.categories = [FactoryGirl.create(:category),
        FactoryGirl.create(:category)]

      assert_equal 2, Transaction.find(t.id).categories.count

      t.update_categories([])
      assert_equal 0, Transaction.find(t.id).categories.count

    end

    it 'it should not create new categories if they exist' do
      FactoryGirl.create :category, name: 'test cat'

      expect do
        trans.update_categories(['test cat'])
      end.to change{Category.count}.by(0)

      expect(trans.categories.count).to eq(1)
    end
  end

  describe '#to_json' do
    it 'should include the attributes for the transaction' do
      expect(trans.to_json).to match(/\"id\":#{trans.id}/)
    end

    it 'should include the categories for the transaction' do
      trans.update_categories ["ham", "cheese"]
      expect(JSON.parse(trans.to_json)["categories"].count).to eq(2)
    end

    it 'should include the recurrence for the transaction' do
      trans.recurrence = FactoryGirl.create(:recurrence, original_date: trans.date)
      expect(JSON.parse(trans.to_json)["recurrence"]["id"])
        .to eq(Recurrence.last.id)
    end
  end

  describe '#handle_recurrence' do
    it 'should do nothing if there is no recurrence' do
      returned = false
      allow_any_instance_of(Transaction).to receive(:update_attribute).and_return{returned = true}
      trans.handle_recurrence nil
      expect(returned).to be(false)
    end

    it 'should create a related recurrence on' do
      expect(Recurrence).to receive(:generate_forward) #first for account creation
      expect(Recurrence).to receive(:generate_forward) #second for recurrence creation
      trans.handle_recurrence({timeframe: '2.weeks'})
      expect(trans.recurrence).to eq(Recurrence.last)
    end

    it 'should generate matching transactions into the future' do
      expect(Recurrence).to receive(:generate_forward)
      expect(Recurrence).to receive(:generate_forward)
      trans.handle_recurrence({:timeframe => '1.months'})
    end

    describe 'when recurrence exists' do
      it 'should update the related recurrence' do
        trans.handle_recurrence({:timeframe => '1.months'})
        trans.handle_recurrence({:timeframe => '3.months'})
        expect(trans.recurrence.timeframe).to eq('3.months')
      end

      it 'should remove future occurences' do
        trans.handle_recurrence({:timeframe => '1.months'})
        expect do
          trans.handle_recurrence({:timeframe => '3.months'})
        end.to change{Transaction.count}.from(24).to(8)

      end

      it 'should recreate those occurences with the new data' do
        new_description = 'Brand new transaction'
        trans.handle_recurrence({:timeframe => '1.months'})
        t = Transaction.all[4]
        t.update_attribute(:description, new_description)
        t.handle_recurrence({:timeframe => '1.months'})

        expect(Transaction.last.description).to eq(new_description)
      end
    end
  end

  describe '#projection_date' do
    Recurrence::TIMEFRAMES.each do |tf|
      it "should have a projection date for #{tf}" do
        trans.recurrence = FactoryGirl.create(:recurrence, timeframe: tf)
        forward_date = tf == 'end_of_month' ?
          (trans.date + 1.month).end_of_month :
          trans.date + eval(tf)

        expect(trans.projection_date).to eq(forward_date)
      end
    end
  end

  describe '%recurring?' do
    it 'should be false if no recurrence_id' do
      expect(trans.recurring?).to eq(false)
    end

    it 'should be true when recurrence_id' do
      trans.recurrence = FactoryGirl.create :recurrence
      expect(trans.recurring?).to eq(true)
    end
  end

  describe '#progenerate' do
    it 'should return if there\'s no recurrence for the transaction' do
      aborted = true
      allow_any_instance_of(Transaction).to receive(:projection_date).and_return{aborted = false; Time.now}
      trans.progenerate
      expect(aborted).to eq(true)
    end

    it 'should do nothing if the projection_date is greater than the last review date' do
      r = account.monthly_reviews.last
      t = FactoryGirl.create :transaction, date: r.date + 2.days
      t.recurrence = FactoryGirl.create :recurrence, timeframe: '1.months'
      expect do
        t.progenerate
      end.to change{Transaction.count}.by(0)
    end

    [
      {tr: '1.weeks', change: (MonthlyReview::FUTURE_MONTHS / 12 ) * 52 - ((Time.now.day / 7.0).ceil)},
      {tr: '2.weeks', change: (MonthlyReview::FUTURE_MONTHS / 12 ) * 26 - ((Time.now.day / 7.0).ceil)},
      {tr: '1.months', change: MonthlyReview::FUTURE_MONTHS - 1},
      {tr: '3.months', change: MonthlyReview::FUTURE_MONTHS / 3 - 1},
      {tr: 'end_of_month', change: MonthlyReview::FUTURE_MONTHS - 1}
    ].each do |t|
      it "should have a change of #{t[:change]} for timeframe of #{t[:tr]}" do
        trans.recurrence = FactoryGirl.create :recurrence, timeframe: t[:tr]
        expect do
          trans.progenerate
        end.to change{Transaction.count}.by(t[:change])
      end
    end
  end

  describe '#destroy_forward' do
    before(:each) do
      @t = FactoryGirl.create(:transaction)
      @t.handle_recurrence(timeframe: '1.months')
    end

    it 'should destroy this and forward if inclusive (default)' do
      expect{@t.destroy_forward}.to change{Transaction.count}.to(0)
    end

    it 'should destroy only future transaction if not inclusive' do
      expect{@t.destroy_forward(false)}.to change{Transaction.count}.to(1)
    end

    it 'should destroy only future transactions that have not been paid' do
      Transaction.all[3].update_attribute(:state, 'paid')
      expect{@t.destroy_forward(false)}.to change{Transaction.count}.to(2)
    end
  end
end
