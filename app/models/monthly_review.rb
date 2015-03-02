class MonthlyReview < ActiveRecord::Base
  FUTURE_MONTHS = 24

  belongs_to :account
  has_many :transactions, -> (review) {
    time = Time.new(review.year, review.month)
    where(date: time..time.end_of_month).order(date: :asc, created_at: :asc)
  }, through: :account
  scope :at, -> (time) {
    where(month: time.month, year: time.year)
  }

  validates :account_id, :month, :year, :banked_total, :estimated_total,
    presence: true

  validates :month, uniqueness: { scope: [:account_id, :year] }

  before_save :add_date

  def self.generate_for(account)
    date = account.starting_date
    date = link_and_progress account, date

    while (date < Time.now.beginning_of_month + FUTURE_MONTHS.months) do
      date = link_and_progress account, date
    end
    Recurrence.generate_forward(account)
  end

  def calculate_totals
    @banked = starting_banked
    @estimated = starting_estimated
    transactions.each do |transaction|
      if transaction.state == 'paid'
        @banked += transaction.additive_amount
      end

      @estimated += transaction.additive_amount
      transaction.update_attributes(banked: @banked, estimated: @estimated)
    end
    update_attributes(banked_total: @banked, estimated_total: @estimated)
  end

  def is_in_future?
    Time.now.beginning_of_month <= date
  end

  def min
    transactions.order(estimated: :desc).first
  end

  def max
    transactions.order(estimated: :desc).last
  end

  protected

  def self.link_and_progress(account, date)
    create account: account,
      month: date.month,
      year: date.year,
      banked_total: account.starting_amount,
      estimated_total: account.starting_amount

    date += 1.month
  end

  def review_before
    @review_before ||= account.monthly_reviews.at(month_ago).first
  end

  def month_ago
    Time.new(year, month, 1) - 1.month
  end

  def starting_banked
    review_before ? review_before.banked_total :
      account.starting_amount
  end

  def starting_estimated
    review_before ? review_before.estimated_total :
      account.starting_amount
  end

  def add_date
    write_attribute :date, Time.new(year, month)
  end
end
