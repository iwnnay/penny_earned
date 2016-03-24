PennyEarned::Application.routes.draw do
  get '/assets', to: 'application#assets' if Rails.env == 'development'

  get '/accounts/:id/reviews/:month/:year', to: 'accounts#show', as: 'account_review'
  post '/accounts/:id/calculate_range', to: 'accounts#calculate_range',
    as: 'account_calculate'

  resources :accounts do
    get '/totals', to: 'accounts#totals', as: 'totals'
    get '/min_max', to: 'accounts#min_max', as: 'min_max'
    post '/transactions/bulk/csv/', to: 'transactions#bulk_csv',
      as: 'transactions_bulk_csv'
    get '/transactions/bulk/csv/', to: 'transactions#bulk_csv_new'

    resources :transactions, except: [:edit]
    resources :monthly_reviews, only: [:index]
  end

  devise_for :users

  root to: "accounts#index"
end
