require 'rails_helper'

RSpec.describe BulkTransaction do

  let(:account) { create(:account) }
  let(:no_errors) do
    [
      attributes_for(:transaction),
      attributes_for(:transaction)
    ]
  end

  let(:with_errors) do
    [
      attributes_for(:transaction),
      attributes_for(:transaction, amount: nil)
    ]
  end

  it 'should raise a type error if second argument is not array' do
    expect{described_class.add(account.id, 'String')}.to raise_error(TypeError)
  end

  it 'should insert transactions' do
    expect do
      described_class.add(account, no_errors)
    end.to change{Transaction.count}.by(2)
  end

  it 'should allow account.id to be passed as first argument' do
    expect do
      described_class.add(account.id, no_errors)
    end.to change{Transaction.count}.by(2)
  end

  it 'should return true if there are no errors' do
    expect(described_class.add(account, no_errors)).to be_truthy
  end

  context 'when there are errors' do
    let(:results) { described_class.add(account, with_errors) }
    it 'should return an array of transactions' do
      expect(results).not_to be_empty
    end

    it 'should add the errors to the transactions' do
      expect(results[0][:errors]).not_to be_empty
    end
  end

  context 'when there are string categories' do
    let(:with_categories) do
        no_errors[0] = no_errors[0].merge({categories: ['Dance', 'Lessons']})
        no_errors
    end

    it 'should create the transaction succesfully' do
      expect(described_class.add(account, with_categories)).to be_truthy
    end

    it 'should add the two categories to the database after the transaction' do
      expect do
        described_class.add(account, with_categories)
        described_class.add(account, no_errors)
      end.to change(Category, :count).by(2)
    end

  end
end
