class bank.Recurrence
    constructor: (@options = {}) ->
        @setOptions()

    setOptions: ->
        defaults = {
            renderTo: 'div.row div.recurrence.cell'
        }

        @options = $.extend({}, defaults, @options)

    @create: (options) ->
        instance = new bank.Recurrence(options)
        instance.render()
        instance

    render: () ->
        @element = $(@options.renderTo)
        @element.html(HandlebarsTemplates['recurrences/form'](@options))

        @link = @element.find('#recurrence-link')
        @renderDropDown(@options.timeframe)
        @attachEvents()

    attachEvents: ->
        @link.click =>
            @link.toggleClass('enabled')
            if @link.hasClass('enabled') then @renderDropDown() else @removeDropDown()

        $('input[name="date"]').change => @renderDropDown()

    renderDropDown: (value)->
        if @link.hasClass('enabled')
            original = value || $('select[name="timeframe"]').val()
            date = new Date($('input[name="date"]').val().replace('/','-'))
            dayOfWeek = d3.time.format('%A')(date)
            dayOfMonth = d3.time.format('%d')(date)
            options = [
                {value: "1.weeks", key: "Every week on #{dayOfWeek}"}
                {value: "2.weeks", key: "Every two weeks on #{dayOfWeek}"}
                {value: "1.months", key: "Every month on the #{dayOfMonth}"}
                {value: "3.months", key: "Every three months on the #{dayOfMonth}"}
            ]

            tomorrow = new Date(date.getTime() + 86400000)
            if d3.time.format('%d')(tomorrow) == '01'
                options.push(
                    {
                        value: "end_of_month",
                        key: "Last day of the every month"
                    }
                )

            @element.find('.dropdown-wrapper')
                .html(HandlebarsTemplates['recurrences/dropdown'](options))

            if original or (original == 'end_of_month' && options.length == 5)
                $('select[name="timeframe"]').val(original)

    removeDropDown: ->
            @element.find('.dropdown-wrapper select').remove()

    values: ->
        if @link.hasClass('enabled')
            {timeframe: @element.find('select').val()}
        else
            {}


