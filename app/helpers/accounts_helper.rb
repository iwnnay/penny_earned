module AccountsHelper
  def error_class(amount, additional_classes = '')
      "class=\"#{(amount.nil? ? false : amount < 0) ? 'error ' : '' }#{additional_classes}\"".html_safe
  end

  def review_shortcut_links
    html = ''
    is_current_month = @time.month == Date.today.month &&
      @time.year == Date.today.year

    previous_review =  @account.review_for @time - 1.months
    next_review = @account.review_for @time + 1.months

    if previous_review
      html << review_link_for(
        previous_review, text: ' ', class: 'fa fa-play-circle previous'
      )
    end

    if is_current_month
      html << 'month'
    else
      html << review_link_for(Date.today, text: 'Current Month')
    end

    if next_review
      html << review_link_for(
        next_review, text: ' ', class: 'fa fa-play-circle'
      )
    end

    html.html_safe
  end

  def review_link_for(review, options = {})
    account = @account || review.account
    link_to (options[:text] || review.date
        .strftime((options[:format] || '%b %Y'))),
      account_review_path(account, review.month, review.year),
      options
  end
end
