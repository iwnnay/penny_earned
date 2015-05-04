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

  def calculate_range
    @account = Account.find(params[:id])
    start_time = Time.new(params[:start][:year].to_i,
                          params[:start][:month].to_i).beginning_of_month

    unless params[:finish].nil?
      end_time = Time.new(
        params[:finish][:year].to_i, params[:finish][:month].to_i)
        .end_of_month
    end

    @account.calculate_range(start_time, end_time)

    render nothing: true
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
    end

    def clear_categories
      @account.categories.each do |category|
        category.destroy if category.transactions.empty?
      end
    end
end
