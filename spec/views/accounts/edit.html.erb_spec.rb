require 'rails_helper'

RSpec.describe "accounts/edit", :type => :view do
  before(:each) do
    @account = FactoryGirl.create(:account)
  end

  it "renders the edit account form" do
    render

    assert_select "form[action=?][method=?]", account_path(@account), "post" do
      assert_select "select#account_type_of[name=?]", "account[type_of]"

      assert_select "input#account_name[name=?]", "account[name]"
    end
  end
end
