class bank.Account
    @time = {}
    @data = {}

    @refreshPage: (fromDate) ->
        #should see if fromDate is before current date else it's current date
      bank.Account.calculateRange fromDate, true, ->
          bank.Ajax.get(Routes.account_transactions_path(accountId), {
              dataType: 'html'
              success: (data) ->
                  $('.transactions-wrapper').html(data)
                  $('.transactions-wrapper').removeClass('waiting')
                  #update after this review
                  bank.Account.calculateRange fromDate, false, ->
                      bank.Account.refreshTotals()
              data:
                  month: bank.Account.time.month
                  year: bank.Account.time.year
          })

    @calculateRange: (fromDate, toCurrent, callback = ->) ->
      if toCurrent
          finish =
              month: bank.Account.time.month
              year: bank.Account.time.year
      else
          finish = null

      bank.Ajax.get(Routes.account_calculate_path(accountId), {
          dataType: 'html'
          success: (data) ->
              $('.transactions-wrapper').html(data)
              $('.transactions-wrapper').removeClass('waiting')
              bank.Account.freshAll(fromDate)
          data:
              start:
                  month: fromDate.month
                  year: fromDate.year
              finish: finish
      })

    @refreshTotals: () ->
        bank.Ajax.get Routes.account_totals_path(accountId),
            success: (data) ->
                $('.totals-wrapper').html(data)
                refreshMinMax()
            dataType: 'HTML'

        bank.Ajax.post(Routes
            .account_review_path(accountId, @time.month, @time.year)
        )

    refreshMinMax = ->
        bank.Ajax.get Routes.account_min_max_path(accountId),
            success: (data) ->
                $('.min-max-wrapper').html(data)
            dataType: 'HTML'

    @startDate: ->
        bank.Format.dateFront @data.starting_date

    @maxDate: ->
        bank.Format.dateFront @data.max_date


