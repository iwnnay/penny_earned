FactoryGirl.define do
  factory :user do
    email { |n| "test_user#{n}@email.com" }
    password "password"
  end

  factory :account do
    user
    name 'Bank Account'
    starting_date { t = Time.now; Time.new(t.year, t.month, t.day) }
    starting_amount 1000.00
    type_of  { Account::TYPES[0] }
  end

  factory :monthly_review do
    account
    year { Time.now.year }
    month { Time.now.month }
  end

  factory :transaction do
    account
    description 'test transaction'
    amount 9.99
    date { t = Time.now; Time.new(t.year,t.month,t.day) }
    state 'staged'
  end

  factory :recurrence do
    active true
    timeframe '1.weeks'
    original_date { t = Time.now; Time.new(t.year,t.month,t.day) }
  end

  factory :category do
    name {|n| "Test Category #{n}" }
    user
    account
  end

end
