class BulkTransaction
  def self.add(account, transactions)
    raise TypeError unless transactions.is_a? Array

    account = Account.find(account) unless account.is_a? Account

    errored = []

    transactions.each do |transaction|
      transaction = transaction.with_indifferent_access
      transaction['account'] = account

      categories = transaction.select do |k, v|
        k == 'categories'
      end['categories']

      transaction.delete('categories')

      record = Transaction.new(transaction)
      record.update_categories categories if record.save

      unless record.save
        transaction.delete('account')
        errored << transaction
          .merge(errors: "#{record.errors.full_messages.join(',')}")
      end
    end

    errored.empty? ? true : errored
  end
end
