# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20150602043619) do

  create_table "accounts", force: true do |t|
    t.integer  "user_id",                                                null: false
    t.string   "type_of",                                                null: false
    t.string   "name",                                                   null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.decimal  "starting_amount", precision: 20, scale: 2, default: 0.0
    t.date     "starting_date",                                          null: false
  end

  create_table "categories", force: true do |t|
    t.integer  "user_id"
    t.integer  "account_id"
    t.string   "name"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "categories_transactions", id: false, force: true do |t|
    t.integer "category_id"
    t.integer "transaction_id"
  end

  add_index "categories_transactions", ["category_id"], name: "index_categories_transactions_on_category_id", using: :btree
  add_index "categories_transactions", ["transaction_id"], name: "index_categories_transactions_on_transaction_id", using: :btree

  create_table "monthly_reviews", force: true do |t|
    t.integer  "account_id",                                             null: false
    t.integer  "month",                                                  null: false
    t.integer  "year",                                                   null: false
    t.decimal  "banked_total",    precision: 20, scale: 2,               null: false
    t.decimal  "estimated_total", precision: 20, scale: 2,               null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.date     "date",                                                   null: false
    t.decimal  "credits",         precision: 20, scale: 2, default: 0.0
    t.decimal  "debits",          precision: 20, scale: 2, default: 0.0
    t.decimal  "difference",      precision: 20, scale: 2, default: 0.0
  end

  create_table "recurrences", force: true do |t|
    t.string   "timeframe",                    null: false
    t.boolean  "active",        default: true
    t.datetime "created_at"
    t.datetime "updated_at"
    t.date     "original_date"
  end

  create_table "transactions", force: true do |t|
    t.integer  "account_id",                                                        null: false
    t.decimal  "amount",           precision: 8,  scale: 2, default: 0.0,           null: false
    t.date     "date",                                                              null: false
    t.string   "description",                               default: ""
    t.string   "state",                                     default: "placeholder"
    t.boolean  "debit",                                     default: true
    t.integer  "transfer_to"
    t.integer  "transferred_from"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.decimal  "banked",           precision: 10, scale: 2
    t.decimal  "estimated",        precision: 10, scale: 2
    t.integer  "recurrence_id"
  end

  create_table "users", force: true do |t|
    t.string   "email",                  default: "", null: false
    t.string   "encrypted_password",     default: "", null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string   "current_sign_in_ip"
    t.string   "last_sign_in_ip"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "users", ["email"], name: "index_users_on_email", unique: true, using: :btree
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree

end
