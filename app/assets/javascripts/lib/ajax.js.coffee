class bank.Ajax
    @defaults = {
        url: null
        type: 'POST'
        data: {}
        dataType: 'json'
        success: (data) ->
        error: (data) ->
            response = JSON.parse(data.responseText)
            console.alert(response)
    }

    @get: (url, options = {}) ->
        opts = $.extend({}, bank.Ajax.defaults, options, {url: url, type: 'GET'})
        $.ajax(opts)

    @post: (url, options = {}) ->
        opts = $.extend({}, bank.Ajax.defaults, options, {url: url})
        $.ajax(opts)

    @patch: (url, options = {}) ->
        $.ajax($.extend({}, bank.Ajax.defaults,
            options, {url: url, type: 'PATCH'}))

    @delete: (url, options = {}) ->
        $.ajax($.extend({}, bank.Ajax.defaults,
            options, {url: url, type: 'DELETE'}))
