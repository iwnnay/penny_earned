class Category < ActiveRecord::Base
  has_and_belongs_to_many :transactions
  belongs_to :account
  belongs_to :user

  validates :name, :account_id, :user_id, presence: true
  validates :name, uniqueness: { scope: [:account_id, :user_id] }
end
