class bank.Shroud
    constructor: (target) ->
        @target = $(target)

    id: ->
        @id ||= "#{new Date().getTime()}#{Math.floor(Math.random(9999) * 100)}"

    on: ->
        offset = @target.offset()

        @shroud = $('<div/>')
            .addClass('shroud')
            .append('<div class="spinner fa-circle-o-notch fa-spin fa"></div>')

        @shroud.height(@target.outerHeight(true))
        @shroud.width(@target.outerWidth(true))

        @shroud.css
            top: offset.top
            left: offset.left
            'line-height': "#{@shroud.height()}px"

        $('body').append(@shroud)
        this

    remove: ->
        @shroud.remove()
        this
