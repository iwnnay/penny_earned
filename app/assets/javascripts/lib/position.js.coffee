class bank.Position
    constructor: (bullet, @action) ->
        @bullet = $(bullet)

    on: (target) ->
        @tPos = if target.window then {top: 0, left: 0} else $(target).position()
        @target  = $(target)

        @[@action]()
        @

    center: ->
        bPos = @bullet.position()
        tPos = @tPos

        @xOffset = (@target.width() / 2) - tPos.left - (@bullet.width() / 2)
        @yOffset = (@target.height() / 2) - bPos.top - (@bullet.height() / 2)

        @bullet.css(left: @xOffset, top: @yOffset)

    @center: (bullet) ->
        b = new bank.Position(bullet, 'center')
