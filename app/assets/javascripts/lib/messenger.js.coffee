current_messenger = null

class bank.Messenger
    @count = 0

    opts: () ->
        return @finalOptions if @finalOptions

        defaults = {
            shroud: true
            closeBtn: true
            clickOff: true
            duration: 500
            style:
                padding: '10px'
                width: '80%'
                height: 'auto'
                'z-index': bank.Messenger.count + 2
                position: 'fixed'
            openCallback: ->
            closeCallback: ->
        }

        @finalOptions = $.extend({}, defaults, @options)

    constructor: (@options) ->
        bank.Messenger.count++


    @show: (template, data, options = {}) ->
        current_messenger = new Messenger(options)
        current_messenger.show(HandlebarsTemplates[template](data))

    @hide: ->
        current_messenger.hide()

    @confirm: (options = {}) ->
        defaults = {
            title: 'Confirm'
            positiveText: 'Confirm'
            negativeText: 'Cancel'
            callback: ->
        }
        opts = $.extend({}, defaults, options)
        messenger = new bank.Messenger(
            openCallback: ->
                messenger.element
                    .find('.button').click ->
                        opts.callback($(this).hasClass('messenger-confirm'))
                        messenger.hide()

                        false
        )
        messenger.show(HandlebarsTemplates['application/confirm'](opts))

        messenger


    show: (@html) ->
        @addDivToPage()
        @populateDiv()
        @addShroudToPage()
        @slideDivDown()
        @opts().openCallback()

        @

    hide: ->
        --bank.Messenger.count if bank.Messenger.count
        @slideDivUp()
        @removeDivFromPage()
        @removeShroudFromPage()
        @opts().closeCallback()

        @

    addDivToPage: ->
        @element = $("<div id=\"#{@generateId()}\" class=\"messenger-wrapper\" />")
        $('body').prepend(@element)

    removeDivFromPage: ->
        setTimeout( =>
            @element.remove()
        , @opts().duration)

    populateDiv: ->
        if @opts().closeBtn
            @element.prepend('<a href="#" class="button close fa fa-times-cirlce" /a>')

        @element.html(@html)
        @element.css(@opts().style)


    addShroudToPage: ->
        return unless @opts().shroud
        @shroud = $('<div class="messenger-shroud" />')
        $('body').prepend(@shroud)

    removeShroudFromPage: ->
        setTimeout( =>
            @shroud.remove()
        , @opts().duration)

    slideDivDown: ->
        p = bank.Position.center(@element).on(window)

        @element.css(top: @offset())
        @element.animate(top: p.yOffset)

    slideDivUp: ->
        @element.animate(top: @offset(), duration: @opts().duration)

    offset: ->
        -1 * (@element.outerHeight() + 10)

    generateId: ->
        @htmlId ||= "messenger-#{new Date().getTime()}-#{Math.round(Math.random() * 1000)}"

#Universal Actions
#$ ->
    #$('body').click('
