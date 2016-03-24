class Category < ActiveRecord::Base
  has_and_belongs_to_many :transactions
  belongs_to :account
  belongs_to :user

  validates :name, :account_id, :user_id, presence: true
  validates :name, uniqueness: { scope: [:account_id, :user_id] }

  def self.find_or_create(attributes)
    result = where(attributes).first
    return result if result

    result = new(attributes)
    return result.inspect if result.save

    raise "Could not find or create Category with #{attributes.inspect}"
  end
end
