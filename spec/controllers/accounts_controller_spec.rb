require 'rails_helper'

# This spec was generated by rspec-rails when you ran the scaffold generator.
# It demonstrates how one might use RSpec to specify the controller code that
# was generated by Rails when you ran the scaffold generator.
#
# It assumes that the implementation code is generated by the rails scaffold
# generator.  If you are using any extension libraries to generate different
# controller code, this generated spec may or may not pass.
#
# It only uses APIs available in rails and/or rspec-rails.  There are a number
# of tools you can use to make these specs even more expressive, but we're
# sticking to rails and rspec-rails APIs to keep things simple and stable.
#
# Compared to earlier versions of this generator, there is very limited use of
# stubs and message expectations in this spec.  Stubs are only used when there
# is no simpler way to get a handle on the object needed for the example.
# Message expectations are only used when there is no simpler way to specify
# that an instance is receiving a specific message.

RSpec.describe AccountsController, :type => :controller do
  before(:each) do
    @user = FactoryGirl.create(:user)
    sign_in :user, @user
  end

  after(:each) do
    sign_out @user
  end

  let(:valid_attributes) {
    FactoryGirl.attributes_for(:account, user_id: @user.id)
  }

  let(:new_attributes) {
    {name: 'New Credit Line', type_of: 'Credit Card'}
  }

  let(:invalid_attributes) {
    FactoryGirl.attributes_for(:account, user_id: @user.id, type_of: nil, name: nil)
  }

  let(:account) {
      @account ||= FactoryGirl.create(:account, user: @user)
  }


  describe "GET index" do
    it "assigns all users accounts as @accounts" do
      get :index, {}
      expect(assigns(:accounts)).to eq([account])
    end
  end

  describe "GET show" do
    it "assigns the requested account as @account" do
      get :show, {:id => account.to_param}
      expect(assigns(:account)).to eq(account)
    end

    it 'should redirect to account index if not user account' do
      random_account = FactoryGirl.create :account
      get :show, {:id => random_account.to_param}
      expect(response).to redirect_to(root_url)
    end

    it 'should be able to find transactions for a specific month/year' do
      time = Time.now + 3.months
      account.save
      FactoryGirl.create(:transaction, account_id: account.id)
      t = FactoryGirl.create(:transaction, date: time, account_id: account.id)

      get :show, {id: account.id, month: time.month, year: time.year}
      expect(assigns(:transactions)).to eq([t])
    end
  end

  describe "GET new" do
    it "assigns a new account as @account" do
      get :new
      expect(assigns(:account)).to be_a_new(Account)
    end
  end

  describe "GET edit" do
    it "assigns the requested account as @account" do
      account = FactoryGirl.create(:account, user: @user)
      get :edit, {:id => account.to_param}
      expect(assigns(:account)).to eq(account)
    end
  end

  describe "POST create" do
    describe "with valid params" do
      it "creates a new Account" do
        expect {
          post :create, {:account => valid_attributes}
        }.to change(Account, :count).by(1)
      end

      it "assigns a newly created account as @account" do
        post :create, {:account => valid_attributes}
        expect(assigns(:account)).to be_a(Account)
        expect(assigns(:account)).to be_persisted
      end

      it "redirects to the created account" do
        post :create, {:account => valid_attributes}
        expect(response).to redirect_to(Account.last)
      end
    end

    describe "with invalid params" do
      it "assigns a newly created but unsaved account as @account" do
        post :create, {:account => {}}
        expect(assigns(:account)).to be_a_new(Account)
      end

      it "re-renders the 'new' template" do
        post :create, {:account => {}}
        expect(response).to render_template("new")
      end
    end
  end

  describe "PUT update" do

    describe "with valid params" do
      it "updates the requested account" do
        account = Account.create! valid_attributes
        put :update, {:id => account.to_param, :account => new_attributes}
        account.reload
        expect(Account.last.name).to eq('New Credit Line')
        expect(Account.last.type_of).to eq('Credit Card')
      end

      it "assigns the requested account as @account" do
        account = Account.create! valid_attributes
        put :update, {:id => account.to_param, :account => valid_attributes}
        expect(assigns(:account)).to eq(account)
      end

      it "redirects to the account" do
        account = Account.create! valid_attributes
        put :update, {:id => account.to_param, :account => valid_attributes}
        expect(response).to redirect_to(account)
      end
    end

    describe "with invalid params" do
      it "assigns the account as @account" do
        account = Account.create! valid_attributes
        put :update, {:id => account.to_param, :account => invalid_attributes}
        expect(assigns(:account)).to eq(account)
      end

      it "re-renders the 'edit' template" do
        account = Account.create! valid_attributes
        put :update, {:id => account.to_param, :account => invalid_attributes}
        expect(response).to render_template("edit")
      end
    end
  end

  describe "DELETE destroy" do
    it "destroys the requested account" do
      account = Account.create! valid_attributes
      expect {
        delete :destroy, {:id => account.to_param}
      }.to change(Account, :count).by(-1)
    end

    it "redirects to the accounts list" do
      account = Account.create! valid_attributes
      delete :destroy, {:id => account.to_param}
      expect(response).to redirect_to(accounts_url)
    end
  end

  describe "POST calculate_range" do
    before(:each) do
      @t = FactoryGirl.create(:transaction)
    end

    def time_hash(start_time = nil, end_time = nil)
      start_time = Time.now.beginning_of_month if start_time.nil?
      {id: @t.account.id, start: {month: start_time.month.to_s, year: start_time.year.to_s}}.merge(
        end_time.nil? ? {} : {finish: {month: end_time.month.to_s, year: end_time.year.to_s}}
      )
    end

    it "should render nothing" do
      post :calculate_range, time_hash
      expect(response.body).to eq(' ')
    end

    it "should calculate the reviews between the start and finish times" do
      post :calculate_range, time_hash(nil,Time.now.end_of_month)
      expect(Transaction.find(@t.id).estimated).not_to be_nil
    end

    it "should allow for the finish time to be nil" do
      post :calculate_range, time_hash
      expect(Transaction.find(@t.id).estimated).not_to be_nil
    end
  end

end
