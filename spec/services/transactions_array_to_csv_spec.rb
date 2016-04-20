require 'rails_helper'
require 'transactions_array_to_csv'
require 'csv'

RSpec.describe TransactionsArrayToCSV do
  let(:transactions) do
    [ create(:transaction).attributes, create(:transaction).attributes ]
  end

  let(:result) { described_class.parse(transactions) }

  describe 'self.parse' do
    it 'should return a CSV class' do
      expect(result).to be_a(CSV::Table)
    end

    it 'should have three rows' do
      expect(result.count).to eq(3)
    end

    it 'should return a string that has headers in the first row' do
      expect(result[0].map { |a,b| a }).to include('amount')
    end

    it 'should return a string with values in subsequent rows' do
      expect(result[2].map { |a,b| b}).to include(Transaction.last.id)
    end
  end
end
