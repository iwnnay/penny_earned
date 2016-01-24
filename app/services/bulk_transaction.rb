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

      transaction = Transaction.new(transaction)
      transaction.update_categories categories if transaction.save

      unless transaction.save
        errored << transaction.attributes
          .merge(errors: transaction.errors.messages)
      end
    end

    errored.empty? ? true : errored
  end
end
