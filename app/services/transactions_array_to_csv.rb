class TransactionsArrayToCSV
  def self.parse(data)
    new(data).parse
  end

  def initialize(data)
    @data = data
  end

  def parse
    headers = CSV::Row.new(@data.first.keys, [], true)
    table = CSV::Table.new([headers])

    @data.each do |datum|
      row = CSV::Row.new([], [], false)

      @data.first.keys.each { |key| row << datum[key] }

      table << row
    end

    table
  end
end
