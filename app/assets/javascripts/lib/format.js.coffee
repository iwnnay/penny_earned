class bank.Format
    @dateFront: (date = false) ->
        bank.Format.date(date, '%m/%d/%Y')

    @dateBack: (date = false) ->
        bank.Format.date(date, '%d/%m/%Y')

    @date: (date = false, formatString = false) ->
        if date
            date = date.substring(0,10).split('-')
            date = "#{date[1]}-#{date[2]}-#{date[0]}"

        date = if date then new Date(date) else new Date()
        d3.time.format(formatString || '%m/%d/%Y')(date)
