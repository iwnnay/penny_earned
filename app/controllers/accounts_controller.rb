class AccountsController < ApplicationController
  before_action :set_account, only: [:show, :edit, :update, :destroy, :totals,
    :min_max]
  before_action :authenticate_user!
  before_action :clear_extras, only: :show

  respond_to :html

  def index
    @accounts = Account.where(user_id: current_user.id)
    respond_with(@accounts)
  end

  def show
    if @account.nil?
      redirect_to root_path
    else
      @time = params[:year] ?
        Time.new(params[:year], params[:month]) : Time.now.beginning_of_month
      @transactions = @account.review_for(@time).transactions

      respond_with(@account)
    end
  end

  def new
    @account = Account.new
    respond_with(@account)
  end

  def edit
  end

  def create
    params[:account][:user_id] = current_user.id

    @account = Account.new(account_params)
    @account.save

    respond_with(@account)
  end

  def update
    @account.update(account_params)
    respond_with(@account)
  end

  def destroy
    @account.destroy
    respond_with(@account)
  end

  def totals
    render partial: 'totals', locals: {account: @account}
  end

  def min_max
    render partial: 'min_max', locals: {account: @account}
  end

  def update_future_reviews
    time = Time.new(params[:year], params[:month])

    Account.find(params[:id]).update_after(time)

    render json: { success: true }
  end

  private
    def set_account
      @account = Account.where(id: params[:id] || params[:account_id],
        user: current_user).first
    end

    def account_params
      params.require(:account).permit(:user_id, :type_of, :name,
        :starting_date, :starting_amount)
    end

    def clear_extras
      return if @account.nil?
      clear_categories
      clear_transactions
    end

    def clear_categories
      @account.categories.each do |category|
        category.destroy if category.transactions.empty?
      end
    end

    def clear_transactions
      @account.transactions.where(state: Transaction::STATES[0])
        .destroy_all
    end

end
