require 'rails_helper'

RSpec.describe "accounts/index", :type => :view do
  before(:each) do
    assign(:accounts,
      [FactoryGirl.create(:account), FactoryGirl.create(:account)]
    )
  end

  it "renders a list of accounts" do
    render
    assert_select "tr>th", :text => "Type:".to_s, :count => 1
    assert_select "tr>th", :text => "Name:".to_s, :count => 1
  end
end
