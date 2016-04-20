require 'csv'

class CSVToTransactions
  def self.parse(file)
    new(file).parse
  end

  def initialize(file)
    @file = file
  end

  def parse
    transactions = []
    converter = lambda { |header| header.try(:downcase) }

    CSV.parse(@file.read, headers: true, header_converters: converter) do |row|
      @current_row = row.to_hash

      verify_date
      verify_amount
      verify_state
      verify_debit
      verify_categories
      verify_description

      transactions << @current_row
    end

    transactions
  end

private
  def verify_date
    return if @current_row['date'].nil?

    begin
      date = cur_date.split('/')
      date = Date.new(date[2].to_i, date[0].to_i, date[1].to_i)
      date = date.strftime('%Y-%m-%d')
      @current_row['date'] = date
    rescue
      @current_row['date'] = nil
    end
  end

  def verify_amount
    @current_row['amount'] = cur_amount.gsub(/\$/, '') unless cur_amount.nil?
    @current_row['amount'] = cur_amount.to_f
    @current_row['amount'] = nil if cur_amount === 0.0

    return if cur_amount == nil

    if cur_debit.nil?
      if cur_amount < 0.0
        @current_row['debit'] = true
        @current_row['amount'] = cur_amount.abs
      else
        @current_row['debit'] = false
      end
    end
  end

  def verify_state
    state = cur_state.try(:downcase)
    state = nil unless Transaction::STATES.include? state
    @current_row['state'] = state || Transaction::STATES[0]
  end

  def verify_debit
    return if [true, false].include? cur_debit || cur_debit.nil?


    if ['credit', 'false'].include? cur_debit.downcase
      @current_row['debit'] = false
    else
      @current_row['debit'] = true
    end
  end

  def verify_categories
    if cur_categories =~ /;/
      @current_row['categories'] = cur_categories.split(';')

    elsif cur_categories =~ /,/
      @current_row['categories'] = cur_categories.split(',')

    elsif cur_categories.nil? || cur_categories.try(:empty?)
      @current_row['categories'] = []

    else
      @current_row['categories'] = [cur_categories]
    end

    @current_row['categories'] = cur_categories.map do |category|
      saniwipe(category)
    end
  end

  def saniwipe(string)
    string.gsub(/[^\w -]/, '').squeeze(' ').strip
  end

  def verify_description
    return if cur_description.nil?

    @current_row['description'] = saniwipe cur_description
  end

  %w{amount date state debit categories description}.each do |column|
    define_method :"cur_#{column}", proc{ @current_row[column] }
  end
end
