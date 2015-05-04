class bank.Account
    @time = {}
    @data = {}

    @refreshPage: (fromDate) ->
      bank.Account.calculateRange fromDate, true, =>
          bank.Ajax.get(
              Routes.account_transactions_path(accountId), {
                  dataType: 'html'
                  success: (data) ->
                      $('.transactions-wrapper').html(data)
                      $('.transactions-wrapper').removeClass('waiting')
                      bank.Account.calculateRange fromDate, false, ->
                          bank.Account.refreshTotals()
                  data:
                      month: @time.month
                      year: @time.year
              })

    @calculateRange: (fromDate, toCurrent, callback = ->) ->
      if toCurrent
          if @time.year < fromDate.year and @time.month < fromDate.month
              return callback()

          finish = finish:
              month: bank.Account.time.month
              year: bank.Account.time.year
      else
          finish = {}


      bank.Ajax.post(Routes.account_calculate_path(accountId), {
          dataType: 'html'
          success: (data) ->
              callback()
          data: $.extend(
              start:
                  month: fromDate.month
                  year: fromDate.year
          , finish)
      })

    @refreshTotals: () ->
        bank.Ajax.get Routes.account_totals_path(accountId),
            success: (data) ->
                $('.totals-wrapper').html(data)
                refreshMinMax()
            dataType: 'HTML'

    refreshMinMax = ->
        bank.Ajax.get Routes.account_min_max_path(accountId),
            success: (data) ->
                $('.min-max-wrapper').html(data)
            dataType: 'HTML'

    @startDate: ->
        bank.Format.dateFront @data.starting_date

    @maxDate: ->
        bank.Format.dateFront @data.max_date


