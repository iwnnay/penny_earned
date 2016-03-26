require 'rails_helper'

RSpec.describe CSVToTransactions do

  let(:file) { File.open("spec/resources/csv/example_penny.csv") }

  let(:key) do
    {
      example: 0,
      missing_date: 1,
      incorrect_date: 2,
      invalid_amount: 1,
      missing_amount: 2,
      negative_dollars: 3,
      positive_dollars: 5,
      negative_amount: 4,
      no_state: 6,
      state_paid: 0,
      state_pending: 3,
      invalid_state: 7,
      debit_true: 0,
      debit_false: 1,
      debit_credit: 9,
      debit_debit: 8,
      no_debit: 6,
      comma_and_space: 0,
      semicolon: 1,
      spaced_category: 2,
      nil_category: 8,
      obnoxious_description: 9
    }
  end

  def line(name)
    @result ||= described_class.parse(file)
    @result[key[name]]
  end

  describe ':parse' do
    it 'should set date to nil if its missing' do
      expect(line(:missing_date)['date']).to eq(nil)
    end

    it 'should set date to nil if its the wrong format' do
      expect(line(:incorrect_date)['date']).to eq(nil)
    end

    it 'missing amount should be set to nil' do
      expect(line(:missing_amount)['amount']).to eq(nil)
    end

    it 'should turn integer to float for amount' do
      expect(line(:example)['amount']).to eq(20.0)
    end

    it 'should set non-numeric amounts to nil' do
      expect(line(:invalid_amount)['amount']).to eq(nil)
    end

    it 'should remove dollar signss from the negative amount' do
      expect(line(:negative_dollars)['amount']).to eq(20.0)
      expect(line(:negative_dollars)['debit']).to be_truthy
    end

    it 'should remove dollar signss from the positive amount' do
      expect(line(:positive_dollars)['amount']).to eq(20.0)
      expect(line(:positive_dollars)['debit']).to be_falsy
    end

    it 'should pull in the state' do
      expect(line(:state_pending)['state']).to eq('pending')
      expect(line(:state_paid)['state']).to eq('paid')
    end

    it 'should default the state to placeholder' do
      expect(line(:no_state)['state']).to eq('placeholder')
      expect(line(:invalid_state)['state']).to eq('placeholder')
    end

    it 'should assume true for debit means true' do
      expect(line(:debit_true)['debit']).to equal(true)
    end

    it 'should assume false for debit is a false' do
      expect(line(:debit_false)['debit']).to equal(false)
    end

    it 'should assume debit for debit means true' do
      expect(line(:debit_debit)['debit']).to equal(true)
    end

    it 'should assume credit for debit is false' do
      expect(line(:debit_credit)['debit']).to equal(false)
    end

    it 'should include categories if theyre divded by a semi-colon' do
      expect(line(:semicolon)['categories']).to be_a(Array)
      expect(line(:semicolon)['categories']).to include('gifts')
      expect(line(:semicolon)['categories']).to include('friends')
    end

    it 'should include categories if theyre divded by a comma' do
      expect(line(:comma_and_space)['categories']).to be_a(Array)
      expect(line(:comma_and_space)['categories']).to include('entertainment')
      expect(line(:comma_and_space)['categories']).to include('gifts')
    end

    it 'should sanitize the categories' do
      expect(line(:spaced_category)['categories']).to be_a(Array)
      expect(line(:spaced_category)['categories']).to include('gifts')
      expect(line(:spaced_category)['categories']).to include('best FRIENDS')
    end

    it 'should sanitize the description to be only valid characters' do
      expect(line(:obnoxious_description)['description']).to eq('Maga-zine subscription')
    end
  end
end
