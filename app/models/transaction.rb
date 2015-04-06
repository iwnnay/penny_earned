class Transaction < ActiveRecord::Base
  belongs_to :account
  belongs_to :recurrence
  has_one :user, through: :account
  has_and_belongs_to_many :categories
  before_validation :set_default_date

  after_save :create_categories

  STATES = %w{placeholder paid pending}

  validates :account_id, presence: true
  validates :state, inclusion: {in: Transaction::STATES}
  validates :debit, inclusion: {in: [true, false]}
  validate :transaction_date_greater_than_account_start_date

  def to_json(options = {})
    attributes.to_h.merge(categories: categories, recurrence: recurrence)
      .to_json(options)
  end

  def update_categories(names)
    @categories_to_add = names
    create_categories unless id.nil?
  end

  def handle_recurrence(rec_atts)
    return if rec_atts.nil?
    attributes = {
      timeframe: rec_atts[:timeframe],
      original_date: date
    }

    if recurring?
      recurrence.update_attributes(attributes)
      destroy_forward(false)
    else
      update_attribute(:recurrence, Recurrence.create(attributes))
    end

    Recurrence.generate_forward(self)
  end

  def progenerate
    return unless recurring?
    if projection_date <= account.end_date

      Transaction.create(
        {}.merge(attributes.to_h)
          .merge(
            {
              date: projection_date,
              id: nil,
              state: 'placeholder',
              categories: categories
            }
          )
      ).progenerate
    end
  end

  def recurring?
    !!recurrence_id
  end

  def projection_date
    case recurrence.timeframe
    when 'end_of_month'
      (date + 1.months).end_of_month
    else
      date + eval(recurrence.timeframe)
    end
  end

  def destroy_forward(inclusive = true)
    recurrence.transactions
      .where(date: (date + (inclusive ? 0 : +1.days))..account.end_date)
      .where.not(state: 'paid')
      .destroy_all
  end

  def additive_amount
    (debit ? -1 : 1) * amount
  end

  private

  def set_default_date
    self.date ||= Time.now
  end

  def create_categories
    return if @categories_to_add.nil?

    categories.clear
    @categories_to_add.each do |name|
      if (c = Category.where(name: name).first)
        categories << c
      else
        categories << Category.create(account: account, user: user,
          name: name)
      end
    end
  end

  def transaction_date_greater_than_account_start_date
    if date < account.starting_date
      errors.add(:date,
        'Cannot save transaction before the start of the account')
    end
  end

end
