require 'rails_helper'

RSpec.describe Category, :type => :model do
  it { should belong_to(:account) }
  it { should belong_to(:user) }

  it { should validate_presence_of(:name) }

  describe 'find_or_create' do
    it 'should find and return an existing result' do
      category = create(:category)
      result = Category.find_or_create(category.attributes)

      expect(result).to eq(category)

    end

    it 'should create a non-existent category' do
      expect do
        category = build(:category)
        category = Category.find_or_create(category.attributes)
      end.to change(Category, :count).by(1)
    end

    it 'should error out if it can do neither' do
        expect{described_class.find_or_create([])}.to raise_error(RuntimeError)
    end

  end
end
