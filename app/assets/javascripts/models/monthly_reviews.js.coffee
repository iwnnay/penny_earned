$ ->
    $('body').append($('ul.date-selector'))

    $('.main-date').click ->
        pos = $(this).position()
        $('ul.date-selector').addClass('visible').css
            top: pos.top + 20, left: pos.left + 10

        false

    $(window).click (e) ->
        ul = $('ul.date-selector.visible')
        if $('ul.date-selector.visible').length
            targ = $(e.target)
            hasClass = targ.hasClass('date-selector')
            hasParents = targ.parents('.date-selector').length
            unless hasClass or hasParents
                ul.removeClass('visible')

