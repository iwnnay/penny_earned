class TransactionsController < ApplicationController
  before_action :authenticate_user!

  def create
    transaction = Transaction.new(acceptable_params)
    transaction.account_id = params[:account_id]
    handle_response(transaction) do |success|
      if success
        transaction.update_categories params[:categories]
        transaction.handle_recurrence params[:recurrence]
      end
    end
  end

  def new
    render json: Transaction.new
  end

  def update
    transaction = Transaction.find(params[:id])
    if params[:transaction]
      transaction.update(acceptable_params)
    end
    handle_response(transaction) do |success|
      if success
        transaction.update_categories categories

        if params[:affectSeries] == 'true'
          transaction.handle_recurrence params[:recurrence]
        end

      end
    end
  end

  def show
    render json: Transaction.find(params[:id])
  end

  def index
    @account = Account.find(params[:account_id])
    @time = (params[:year] ? Date.new(params[:year].to_i, params[:month].to_i) : Date.today)
    @transactions = @account.monthly_reviews.at(@time).first.transactions

    render partial: 'accounts/transactions',
      locals: {transactions: @transactions}
  end

  def destroy
    success = false
    transaction = Transaction.find(params[:id])

    if params[:forward_transactions] == 'true'
      transaction.recurrence.update_attribute(:active, false)
      success = transaction.destroy_forward
    else
      success = !!transaction.destroy
    end

    render json: {success: success}
  end

  def bulk_csv
    bulk = BulkTransaction.add(
      params['account_id'], CSVToTransactions.parse(params['csv_file'])
    )

    if bulk === true
      redirect_to account_path(params['account_id'])
    else
      send_data TransactionsArrayToCSV.parse(bulk),
        type: 'text/csv; charset=utf-8; header=present',
        disposition: "attachment; filename=errors-#{Time.new.strftime('%s')}.csv"
    end
  end

  private

  def categories
    return nil if params[:preserve_categories]
    params[:categories] || []
  end

  def acceptable_params
    params.require(:transaction)
      .permit(:account_id, :description, :date, :amount, :state, :debit)
  end
end
