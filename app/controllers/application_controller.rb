class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  def handle_response(record, &block)
    if record.save
      yield true if block_given?
      render json: record
    else
      yield false if block_given?
      render json: {
        errors: record.errors.full_messages
      }, status: :unprocessable_entity
    end
  end
end
