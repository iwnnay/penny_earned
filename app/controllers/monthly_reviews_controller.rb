class MonthlyReviewsController < ApplicationController
  def index
    @account = Account.find params[:account_id]
  end
end
