require 'rails_helper'

RSpec.describe "accounts/new", :type => :view do
  before(:each) do
    @account = Account.new
  end

  it "renders new account form" do
    render

    assert_select "form[action=?][method=?]", accounts_path, "post" do

      assert_select "select#account_type_of[name=?]", "account[type_of]"

      assert_select "input#account_name[name=?]", "account[name]"
    end
  end
end
