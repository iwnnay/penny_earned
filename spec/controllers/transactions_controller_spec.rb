require 'rails_helper'

RSpec.describe TransactionsController, :type => :controller do
  before(:each) do
    @account = FactoryGirl.create(:account)
    sign_in :user, @account.user
  end

  after(:each) do
    sign_out @account.user
  end

  let(:transaction) do
    FactoryGirl.create :transaction
  end

  let(:valid_attributes) do
    FactoryGirl.attributes_for(:transaction)
  end

  let(:invalid_attributes) do
    {state: 'MADE UP'}
  end

  describe '#create' do
    it 'should create a transaction' do
      expect {
        post :create, {account_id: @account.id, transaction: valid_attributes}
      }.to change(Transaction, :count).by(1)
    end

    it 'should return JSON of the created transaction' do
      post :create, {account_id: @account.id, transaction: valid_attributes}
      expect(JSON.parse(response.body)['id']).to eq(Transaction.last.id)
    end

    it 'should return an uprocessable entity when there is an error' do
      post :create, {account_id: @account.id, transaction: invalid_attributes}
      expect(response.status).to eq(422)
    end

    it 'should give errors when not processable' do
      post :create, {account_id: @account.id, transaction: invalid_attributes}
      expect(JSON.parse(response.body)['errors']).to_not eq(nil)
    end

    it 'should add passed categories to the transaction' do
      post :create, {account_id: @account.id, transaction: valid_attributes,
        categories: %w{hey there dude}}
      assert_equal 3, Transaction.last.categories.count
    end
  end

  describe '#update' do
    it 'should erase all the categories if the param isn\'t set' do
      transaction.categories = [FactoryGirl.create(:category),
        FactoryGirl.create(:category)]

      expect {
        patch :update, {account_id: @account.id, id: transaction.id}

        assert_response :success
      }.to change(Transaction.last.categories, :count).by(-2)
    end

    it 'should add categories to the transaction' do
      patch :update, {account_id: @account.id, categories: %w{hey now},
        transaction: {description: 'something totally different'},
        id: transaction.id}

      assert_response :success

      t = Transaction.last
      assert_equal 2, t.categories.count
      assert_equal 'something totally different', t.description
    end

    it 'should add categories when they\'re the only thing added' do
      patch :update, {account_id: @account.id, categories: %w{hey now},
        id: transaction.id, transaction: transaction.attributes}
      assert_response :success
      assert_equal 2, Transaction.last.categories.count
    end

    describe 'handling series' do
      it 'should not update future transaction if affectSeries is false' do
        @account.transactions << transaction
        same = transaction.amount
        new = 200
        transaction.handle_recurrence(timeframe: '1.months')

        patch :update, {account_id: @account.id, id: transaction.id,
          transaction: {amount: new}, affectSeries: false.to_s,
          recurrence: {timeframe: '1.months'}}

        expect(Transaction.find(transaction.id).amount).to eq(new)
        expect(Transaction.last.amount).to eq(same)
      end

      it 'should not update future transaction if affectSeries is nil' do
        @account.transactions << transaction
        same = transaction.amount
        new = 200
        transaction.handle_recurrence(timeframe: '1.months')

        patch :update, {account_id: @account.id, id: transaction.id,
          transaction: {amount: new}, recurrence: {timeframe: '1.months'}}

        expect(Transaction.find(transaction.id).amount).to eq(new)
        expect(Transaction.last.amount).to eq(same)
      end

      it 'should update future transaction if affectSeries' do
        @account.transactions << transaction
        new = 200
        transaction.handle_recurrence(timeframe: '3.months')

        patch :update, {account_id: @account.id, id: transaction.id,
          transaction: {amount: new}, affectSeries: true.to_s, recurrence: {timeframe: '1.months'}}

        expect(Transaction.find(transaction.id).amount).to eq(new)
        expect(Transaction.last.amount).to eq(new)
      end
    end
  end

  describe '#show' do
    it 'should get a json response of the requested transaction' do
      get :show, account_id: transaction.account.id, id: transaction.id
      assert_response :success

      expect(JSON.parse(@response.body)["id"]).to eq(transaction.id)
    end

    it 'should include the categories of the requested transaction' do
      get :show, account_id: transaction.account.id, id: transaction.id
      assert_response :success

      expect(@response.body).to match('categories')
    end
  end

  describe '#destroy' do
    it 'should delete a record' do
      t = FactoryGirl.create(:transaction)
      expect do
        delete :destroy, account_id: t.account_id, id: t.id
      end.to change{Transaction.count}.by(-1)
    end

    it 'should delete only this record if recurrence with forward_transaction false' do
      t = FactoryGirl.create(:transaction)
      t.handle_recurrence timeframe: '1.months', active: true
      expect do
        delete :destroy, account_id: t.account_id, id: t.id, forward_transactions: false.to_s
      end.to change{Transaction.count}.from(MonthlyReview::FUTURE_MONTHS)
        .to(MonthlyReview::FUTURE_MONTHS-1)
    end

    it 'should delete here forward if forward_transactions true with recurrence' do
      t = FactoryGirl.create :transaction
      t.handle_recurrence timeframe: '1.months'
      expect do
        delete :destroy, account_id: t.account_id, id: t.id, forward_transactions: true.to_s
      end.to change{Transaction.count}.from(MonthlyReview::FUTURE_MONTHS).to(0)
    end
  end

  describe '#index' do
    before(:each) do
      @a = FactoryGirl.create(:account)
      @a.transactions << @t = FactoryGirl.create(:transaction)
    end

    it 'should set @account to the given account' do
      get :index, account_id: @a.id
      expect(assigns(:account)).to eq(@a)
    end

    it 'should set a time with the current time one is not given' do
      get :index, account_id: @a.id
      expect(assigns(:time)).to be > 2.seconds.ago
    end

    it 'should set a @time with the given time' do
      t = 3.months.from_now
      get :index, month: t.month, year: t.year, account_id: @a.id
      expect(assigns(:time)).to eq(Time.new(t.year, t.month))
    end

    it 'should set a @transactions with the accounts transactions' do
      get :index, account_id: @a.id
      expect(assigns(:account)).to eq(@a)
    end

    it 'should render the accounts/transactions partial' do
      expect(@controller).to(receive(:render).with({
        partial: "accounts/transactions",
        locals: {transactions: @a.transactions}
      }))
      expect(@controller).to(receive(:render))
      get(:index, {account_id: @a.id})
      assert :success
    end
  end
end
