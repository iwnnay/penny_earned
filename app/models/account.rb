class Account < ActiveRecord::Base
  TYPES = [
    'Checking Account',
    'Savings Account',
    'Credit Card'
  ]

  belongs_to :user
  has_many :transactions
  has_many :future_transactions, -> (account) {
    where(date: Date.today.beginning_of_month..account.end_date)
  }, class_name: 'Transaction'
  has_many :categories
  has_many :monthly_reviews
  has_many :recurrences, through: :transactions
  has_one :most_recent_transaction, -> {
    where(date: Date.today.beginning_of_month..Date.today)
    .order(date: :desc, created_at: :desc).limit(1)
  }, class_name: 'Transaction'
  has_one :meta

  validates :user_id, :type_of, :name, presence: true
  validates :type_of, :name, presence: true
  validates :type_of, inclusion: { in: TYPES }

  after_save :create_reviews

  def create_reviews
    MonthlyReview.generate_for(self)
  end

  def start_month
    started_date.month
  end

  def start_year
    started_date.year
  end

  def review_for(time)
    monthly_reviews.where(month: time.month, year: time.year).first
  end

  def total
    last_transaction.banked
  end

  def estimated
    last_transaction.estimated
  end

  def calculate_range(start, finish = nil)
    finish = end_date if finish.nil?
    monthly_reviews.where(date: start..finish).each do |review|
      review.calculate_totals
    end
  end

  def end_date
    monthly_reviews
      .order(date: :asc).last.date.end_of_month
  end

  def min
    min_info[:amount]
  end

  def max
    max_info[:amount]
  end

  def min_review
    min_info[:review]
  end

  def max_review
    max_info[:review]
  end

  private

  def last_transaction
    if most_recent_transaction.nil?
      OpenStruct.new(banked: starting_amount, estimated: starting_amount)
    else
      most_recent_transaction
    end
  end

  def min_info
    @min_info ||= {
      transaction: (transaction = future_transactions
        .order(estimated: :asc).first),
      review: review_for(transaction.date),
      amount: transaction.estimated
    }
  end

  def max_info
    @max_info ||= {
      transaction: (transaction = future_transactions
        .order(estimated: :desc).first),
      review: review_for(transaction.date),
      amount: transaction.estimated
    }
  end

end
