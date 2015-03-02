class Recurrence < ActiveRecord::Base
  TIMEFRAMES = %w{end_of_month 1.weeks 2.weeks 1.months 3.months}

  has_many :transactions
  has_one :account, through: :transactions

  validates :timeframe, :original_date, presence: true
  validates :timeframe, inclusion: {in: TIMEFRAMES}
  scope :active, -> () { where(active: true) }


  def self.generate_forward(klass)
    account = klass.class.name == 'Transaction' ? klass.account : klass

    account.recurrences.active.each do |recurrence|
      recurrence.transactions.order(date: :desc).first.progenerate
    end
  end
end
