class bank.Account
    @time = {}
    @data = {}

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


