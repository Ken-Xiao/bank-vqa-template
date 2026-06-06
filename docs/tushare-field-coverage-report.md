# Tushare A 股数据审计报告

生成时间：2026-06-02T21:19:01
缓存目录：`/Users/jinkunxiao/Documents/业务/银行财报分析/outputs/vqa_template/data_tushare_cache`

本报告基于已拉取的 A 股 42 家银行 6 年面板数据，输出：
1. 各表字段清单 + 完整度
2. 招商银行 2024 年报样本（人工验证用）
3. BenchmarkIQ 257 字段映射缺口
4. 银行 × 期间覆盖矩阵

## 第 1 部分：各表字段清单

### stock_basic
- 总行数：42  ｜ 字段数：7  ｜ 银行数：42

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `symbol` | 100.0% | object |
| `name` | 100.0% | object |
| `industry` | 100.0% | object |
| `market` | 100.0% | object |
| `list_date` | 100.0% | object |
| `area` | 100.0% | object |

### balancesheet
- 总行数：1,516  ｜ 字段数：152  ｜ 银行数：42
- 期间数：23（20200331 — 20250930）

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `bond_payable` | 100.0% | float64 |
| `defer_tax_assets` | 100.0% | float64 |
| `decr_in_disbur` | 100.0% | float64 |
| `cash_reser_cb` | 100.0% | float64 |
| `total_assets` | 100.0% | float64 |
| `ann_date` | 100.0% | object |
| `taxes_payable` | 100.0% | float64 |
| `depos_oth_bfi` | 100.0% | float64 |
| `oth_assets` | 100.0% | float64 |
| `depos` | 100.0% | float64 |
| `oth_liab` | 100.0% | float64 |
| `total_liab` | 100.0% | float64 |
| `total_hldr_eqy_exc_min_int` | 100.0% | float64 |
| `total_hldr_eqy_inc_min_int` | 100.0% | float64 |
| `total_liab_hldr_eqy` | 100.0% | float64 |
| `fix_assets` | 100.0% | float64 |
| `update_flag` | 100.0% | object |
| `end_date` | 100.0% | object |
| `f_ann_date` | 100.0% | object |
| `cap_rese` | 100.0% | float64 |
| `total_share` | 100.0% | float64 |
| `end_type` | 100.0% | object |
| `comp_type` | 100.0% | object |
| `report_type` | 100.0% | object |
| `trad_asset` | 100.0% | float64 |
| `undistr_porfit` | 100.0% | float64 |
| `oth_comp_income` | 99.9% | float64 |
| `payroll_payable` | 99.9% | float64 |
| `depos_in_oth_bfi` | 99.9% | float64 |
| `surplus_rese` | 99.9% | float64 |
| `cb_borr` | 99.9% | float64 |
| `ordin_risk_reser` | 99.9% | float64 |
| `loan_oth_bank` | 99.2% | float64 |
| `sold_for_repur_fa` | 99.1% | float64 |
| `loanto_oth_bank_fi` | 97.0% | float64 |
| `intan_assets` | 95.2% | float64 |
| `estimated_liab` | 95.0% | float64 |
| `pur_resale_fa` | 93.3% | float64 |
| `minority_int` | 92.3% | float64 |
| `deriv_assets` | 91.3% | float64 |
| `deriv_liab` | 90.6% | float64 |
| `oth_eqt_tools` | 88.9% | float64 |
| `oth_debt_invest` | 74.9% | float64 |
| `lt_eqt_invest` | 73.3% | float64 |
| `debt_invest` | 72.8% | float64 |
| `cip` | 68.3% | float64 |
| `trading_fl` | 63.7% | float64 |
| `oth_eqt_tools_p_shr` | 54.6% | float64 |
| `prec_metals` | 43.5% | float64 |

### income
- 总行数：1,333  ｜ 字段数：85  ｜ 银行数：42
- 期间数：23（20200331 — 20250930）

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `n_oth_income` | 100.0% | float64 |
| `n_income_attr_p` | 100.0% | float64 |
| `n_income` | 100.0% | float64 |
| `income_tax` | 100.0% | float64 |
| `total_profit` | 100.0% | float64 |
| `operate_profit` | 100.0% | float64 |
| `oper_exp` | 100.0% | float64 |
| `ann_date` | 100.0% | object |
| `admin_exp` | 100.0% | float64 |
| `comm_exp` | 100.0% | float64 |
| `int_exp` | 100.0% | float64 |
| `total_cogs` | 100.0% | float64 |
| `invest_income` | 100.0% | float64 |
| `n_oth_b_income` | 100.0% | float64 |
| `update_flag` | 100.0% | object |
| `n_commis_income` | 100.0% | float64 |
| `int_income` | 100.0% | float64 |
| `f_ann_date` | 100.0% | object |
| `end_date` | 100.0% | object |
| `report_type` | 100.0% | object |
| `comp_type` | 100.0% | object |
| `total_revenue` | 100.0% | float64 |
| `revenue` | 100.0% | float64 |
| `comm_income` | 100.0% | float64 |
| `non_oper_income` | 99.9% | float64 |
| `biz_tax_surchg` | 99.9% | float64 |
| `non_oper_exp` | 99.9% | float64 |
| `fv_value_chg_gain` | 99.9% | float64 |
| `oth_b_income` | 99.9% | float64 |
| `end_type` | 99.8% | object |
| `forex_gain` | 99.5% | float64 |
| `basic_eps` | 99.4% | float64 |
| `compr_inc_attr_p` | 99.2% | float64 |
| `t_compr_income` | 99.2% | float64 |
| `oth_compr_income` | 98.8% | float64 |
| `diluted_eps` | 95.7% | float64 |
| `minority_gain` | 92.6% | float64 |
| `compr_inc_attr_m_s` | 92.2% | float64 |
| `other_bus_cost` | 78.6% | float64 |
| `continued_net_profit` | 59.3% | float64 |
| `ass_invest_income` | 57.2% | float64 |
| `ebit` | 27.2% | float64 |
| `ebitda` | 27.2% | float64 |
| `assets_impair_loss` | 6.3% | float64 |
| `adj_lossgain` | 0.0% | object |
| `rd_exp` | 0.0% | object |
| `fin_exp_int_exp` | 0.0% | object |
| `fin_exp_int_inc` | 0.0% | object |
| `transfer_surplus_rese` | 0.0% | object |

### cashflow
- 总行数：1,296  ｜ 字段数：97  ｜ 银行数：42
- 期间数：23（20200331 — 20250930）

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `n_cashflow_act` | 100.0% | float64 |
| `c_cash_equ_beg_period` | 100.0% | float64 |
| `n_incr_cash_cash_equ` | 100.0% | float64 |
| `n_cash_flows_fnc_act` | 100.0% | float64 |
| `ann_date` | 100.0% | object |
| `n_cashflow_inv_act` | 100.0% | float64 |
| `update_flag` | 100.0% | object |
| `end_type` | 100.0% | object |
| `report_type` | 100.0% | object |
| `f_ann_date` | 100.0% | object |
| `end_date` | 100.0% | object |
| `comp_type` | 100.0% | object |
| `c_paid_to_for_empl` | 99.9% | float64 |
| `c_paid_invest` | 99.9% | float64 |
| `c_disp_withdrwl_invest` | 99.9% | float64 |
| `st_cash_out_act` | 99.9% | float64 |
| `oth_cash_pay_oper_act` | 99.9% | float64 |
| `pay_handling_chrg` | 99.9% | float64 |
| `stot_out_inv_act` | 99.9% | float64 |
| `c_paid_for_taxes` | 99.9% | float64 |
| `stot_inflows_inv_act` | 99.9% | float64 |
| `stot_cashout_fnc_act` | 99.9% | float64 |
| `c_cash_equ_end_period` | 99.9% | float64 |
| `c_fr_oth_operate_a` | 99.8% | float64 |
| `ifc_cash_incr` | 99.8% | float64 |
| `c_inf_fr_operate_a` | 99.8% | float64 |
| `c_pay_acq_const_fiolta` | 99.8% | float64 |
| `c_recp_return_invest` | 99.8% | float64 |
| `n_incr_clt_loan_adv` | 99.6% | float64 |
| `c_pay_dist_dpcp_int_exp` | 98.8% | float64 |
| `n_depos_incr_fi` | 97.7% | float64 |
| `eff_fx_flu_cash` | 97.5% | float64 |
| `stot_cash_in_fnc_act` | 96.9% | float64 |
| `n_recp_disp_fiolta` | 90.2% | float64 |
| `c_prepay_amt_borr` | 86.7% | float64 |
| `proc_issue_bonds` | 86.3% | float64 |
| `n_incr_loans_oth_bank` | 71.8% | float64 |
| `n_incr_dep_cbob` | 65.4% | float64 |
| `n_incr_loans_cb` | 64.1% | float64 |
| `net_dism_capital_add` | 62.2% | float64 |
| `im_net_cashflow_oper_act` | 61.3% | float64 |
| `net_profit` | 61.3% | float64 |
| `decr_oper_payable` | 61.0% | float64 |
| `incr_oper_payable` | 60.7% | float64 |
| `loss_fv_chg` | 59.0% | float64 |
| `loss_disp_fiolta` | 56.0% | float64 |
| `invest_loss` | 52.5% | float64 |
| `beg_bal_cash` | 50.7% | float64 |
| `end_bal_cash` | 50.7% | float64 |

### fina_indicator
- 总行数：1,633  ｜ 字段数：108  ｜ 银行数：42
- 期间数：24（20200331 — 20251231）

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `op_income` | 100.0% | float64 |
| `q_op_qoq` | 100.0% | float64 |
| `roa_yearly` | 100.0% | float64 |
| `roe_yearly` | 100.0% | float64 |
| `npta` | 100.0% | float64 |
| `ann_date` | 100.0% | object |
| `roe` | 100.0% | float64 |
| `end_date` | 100.0% | object |
| `profit_to_op` | 99.9% | float64 |
| `netprofit_margin` | 99.9% | float64 |
| `adminexp_of_gr` | 99.9% | float64 |
| `op_of_gr` | 99.9% | float64 |
| `profit_to_gr` | 99.9% | float64 |
| `q_npta` | 99.8% | float64 |
| `q_roe` | 99.8% | float64 |
| `assets_yoy` | 99.3% | float64 |
| `bps_yoy` | 99.3% | float64 |
| `retainedps` | 99.3% | float64 |
| `bps` | 99.3% | float64 |
| `diluted2_eps` | 99.3% | float64 |
| `retained_earnings` | 99.3% | float64 |
| `undist_profit_ps` | 99.3% | float64 |
| `debt_to_assets` | 99.3% | float64 |
| `assets_to_eqt` | 99.3% | float64 |
| `dp_assets_to_eqt` | 99.3% | float64 |
| `debt_to_eqt` | 99.3% | float64 |
| `eqt_to_debt` | 99.3% | float64 |
| `roa_dp` | 99.3% | float64 |
| `fixed_assets` | 99.3% | float64 |
| `eqt_yoy` | 99.3% | float64 |
| `q_ocf_to_sales` | 99.3% | float64 |
| `capital_rese_ps` | 99.3% | float64 |
| `assets_turn` | 99.3% | float64 |
| `op_yoy` | 99.3% | float64 |
| `ebt_yoy` | 99.3% | float64 |
| `revenue_ps` | 99.3% | float64 |
| `netprofit_yoy` | 99.3% | float64 |
| `total_revenue_ps` | 99.3% | float64 |
| `tr_yoy` | 99.2% | float64 |
| `or_yoy` | 99.2% | float64 |
| `surplus_rese_ps` | 99.2% | float64 |
| `ocf_to_debt` | 99.0% | float64 |
| `cfps` | 99.0% | float64 |
| `ocfps` | 99.0% | float64 |
| `q_sales_yoy` | 98.7% | float64 |
| `ocf_yoy` | 98.5% | float64 |
| `roe_yoy` | 98.5% | float64 |
| `equity_yoy` | 98.5% | float64 |
| `basic_eps_yoy` | 98.1% | float64 |

### daily_basic
- 总行数：2,889  ｜ 字段数：12  ｜ 银行数：42
- 时间范围：20200228 — 20251231

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `ts_code` | 100.0% | object |
| `trade_date` | 100.0% | object |
| `close` | 100.0% | float64 |
| `pe` | 100.0% | float64 |
| `pe_ttm` | 100.0% | float64 |
| `pb` | 100.0% | float64 |
| `ps_ttm` | 100.0% | float64 |
| `total_mv` | 100.0% | float64 |
| `circ_mv` | 100.0% | float64 |
| `turnover_rate` | 100.0% | float64 |
| `dv_ratio` | 96.3% | float64 |
| `dv_ttm` | 94.4% | float64 |

### shibor
- 总行数：1,482  ｜ 字段数：9  ｜ 银行数：1

**字段完整度（前 50 列）**

| 字段 | 完整度 | dtype |
|---|---:|---|
| `date` | 100.0% | object |
| `on` | 100.0% | float64 |
| `1w` | 100.0% | float64 |
| `2w` | 100.0% | float64 |
| `1m` | 100.0% | float64 |
| `3m` | 100.0% | float64 |
| `6m` | 100.0% | float64 |
| `9m` | 100.0% | float64 |
| `1y` | 100.0% | float64 |

## 招商银行 2024 年报样本（人工对照）

用 BenchmarkIQ 现有 data.js 里的招行 2024 数据对比下表数值，若一致则字段映射正确。


### balancesheet（54 个非空字段）

| 字段 | 值 |
|---|---:|
| `ts_code` | 600036.SH |
| `ann_date` | 20,250,326.00 |
| `f_ann_date` | 20,250,326.00 |
| `end_date` | 20,241,231.00 |
| `report_type` | 1.00 |
| `comp_type` | 2.00 |
| `end_type` | 4.00 |
| `total_share` | 25,219,845,601 |
| `cap_rese` | 65,429,000,000 |
| `undistr_porfit` | 634,078,000,000 |
| `surplus_rese` | 122,652,000,000 |
| `trad_asset` | 617,018,000,000 |
| `loanto_oth_bank_fi` | 408,955,000,000 |
| `pur_resale_fa` | 271,329,000,000 |
| `lt_eqt_invest` | 31,015,000,000 |
| `invest_real_estate` | 1,117,000,000 |
| `oth_assets` | 57,258,000,000 |
| `fix_assets` | 123,991,000,000 |
| `cip` | 3,825,000,000 |
| `intan_assets` | 6,406,000,000 |
| `goodwill` | 9,954,000,000 |
| `defer_tax_assets` | 83,674,000,000 |
| `decr_in_disbur` | 6,632,548,000,000 |
| `cash_reser_cb` | 574,065,000,000 |
| `depos_in_oth_bfi` | 220,231,000,000 |
| `prec_metals` | 9,415,000,000 |
| `deriv_assets` | 32,533,000,000 |
| `total_assets` | 12,152,036,000,000 |
| `cb_borr` | 189,934,000,000 |
| `loan_oth_bank` | 235,376,000,000 |
| `trading_fl` | 67,461,000,000 |
| `sold_for_repur_fa` | 84,042,000,000 |
| `payroll_payable` | 34,512,000,000 |
| `taxes_payable` | 11,713,000,000 |
| `bond_payable` | 222,921,000,000 |
| `estimated_liab` | 16,762,000,000 |
| `defer_tax_liab` | 1,592,000,000 |
| `depos_oth_bfi` | 699,975,000,000 |
| `deriv_liab` | 31,583,000,000 |
| `depos` | 9,195,329,000,000 |
| `oth_liab` | 110,390,000,000 |
| `total_liab` | 10,918,561,000,000 |
| `ordin_risk_reser` | 154,932,000,000 |
| `minority_int` | 7,461,000,000 |
| `total_hldr_eqy_exc_min_int` | 1,226,014,000,000 |
| `total_hldr_eqy_inc_min_int` | 1,233,475,000,000 |
| `total_liab_hldr_eqy` | 12,152,036,000,000 |
| `oth_comp_income` | 43,257,000,000 |
| `oth_eqt_tools` | 180,446,000,000 |
| `oth_eqt_tools_p_shr` | 27,468,000,000 |
| `cost_fin_assets` | 1,941,580,000,000 |
| `contract_liab` | 4,193,000,000 |
| `oth_debt_invest` | 1,092,127,000,000 |
| `update_flag` | 1.00 |

### income（41 个非空字段）

| 字段 | 值 |
|---|---:|
| `ts_code` | 600036.SH |
| `ann_date` | 20,250,326.00 |
| `f_ann_date` | 20,250,326.00 |
| `end_date` | 20,241,231.00 |
| `report_type` | 1.00 |
| `comp_type` | 2.00 |
| `end_type` | 4.00 |
| `basic_eps` | 5.66 |
| `diluted_eps` | 5.66 |
| `total_revenue` | 337,488,000,000 |
| `revenue` | 337,488,000,000 |
| `int_income` | 374,271,000,000 |
| `comm_income` | 81,040,000,000 |
| `n_commis_income` | 72,094,000,000 |
| `n_oth_income` | 47,033,000,000 |
| `n_oth_b_income` | 7,042,000,000 |
| `oth_b_income` | 14,126,000,000 |
| `fv_value_chg_gain` | 6,085,000,000 |
| `invest_income` | 29,880,000,000 |
| `ass_invest_income` | 2,632,000,000 |
| `forex_gain` | 4,026,000,000 |
| `total_cogs` | 158,469,000,000 |
| `int_exp` | 162,994,000,000 |
| `comm_exp` | 8,946,000,000 |
| `biz_tax_surchg` | 2,950,000,000 |
| `admin_exp` | 107,616,000,000 |
| `oper_exp` | 158,469,000,000 |
| `other_bus_cost` | 7,084,000,000 |
| `operate_profit` | 179,019,000,000 |
| `non_oper_income` | 63,000,000.00 |
| `non_oper_exp` | 430,000,000 |
| `total_profit` | 178,652,000,000 |
| `income_tax` | 29,093,000,000 |
| `n_income` | 149,559,000,000 |
| `n_income_attr_p` | 148,391,000,000 |
| `minority_gain` | 1,168,000,000 |
| `oth_compr_income` | 26,693,000,000 |
| `t_compr_income` | 176,252,000,000 |
| `compr_inc_attr_p` | 174,962,000,000 |
| `compr_inc_attr_m_s` | 1,290,000,000 |
| `update_flag` | 1.00 |

### cashflow（56 个非空字段）

| 字段 | 值 |
|---|---:|
| `ts_code` | 600036.SH |
| `ann_date` | 20,250,326.00 |
| `f_ann_date` | 20,250,326.00 |
| `end_date` | 20,241,231.00 |
| `comp_type` | 2.00 |
| `report_type` | 1.00 |
| `end_type` | 4.00 |
| `net_profit` | 149,559,000,000 |
| `n_depos_incr_fi` | 941,149,000,000 |
| `ifc_cash_incr` | 368,373,000,000 |
| `c_fr_oth_operate_a` | 46,353,000,000 |
| `c_inf_fr_operate_a` | 1,586,961,000,000 |
| `c_paid_to_for_empl` | 62,251,000,000 |
| `c_paid_for_taxes` | 52,648,000,000 |
| `n_incr_clt_loan_adv` | 432,133,000,000 |
| `n_incr_dep_cbob` | 45,739,000,000 |
| `pay_handling_chrg` | 151,582,000,000 |
| `oth_cash_pay_oper_act` | 30,753,000,000 |
| `st_cash_out_act` | 1,139,938,000,000 |
| `n_cashflow_act` | 447,023,000,000 |
| `c_disp_withdrwl_invest` | 2,045,080,000,000 |
| `c_recp_return_invest` | 113,717,000,000 |
| `n_recp_disp_fiolta` | 10,757,000,000 |
| `stot_inflows_inv_act` | 2,169,970,000,000 |
| `c_pay_acq_const_fiolta` | 34,930,000,000 |
| `c_paid_invest` | 2,427,328,000,000 |
| `stot_out_inv_act` | 2,462,829,000,000 |
| `n_cashflow_inv_act` | -292,859,000,000 |
| `proc_issue_bonds` | 24,995,000,000 |
| `oth_cash_recp_ral_fnc_act` | 9,947,000,000 |
| `stot_cash_in_fnc_act` | 281,970,000,000 |
| `c_pay_dist_dpcp_int_exp` | 61,031,000,000 |
| `oth_cashpay_ral_fnc_act` | 11,775,000,000 |
| `stot_cashout_fnc_act` | 279,821,000,000 |
| `n_cash_flows_fnc_act` | 2,149,000,000 |
| `eff_fx_flu_cash` | 1,195,000,000 |
| `n_incr_cash_cash_equ` | 157,508,000,000 |
| `c_cash_equ_beg_period` | 599,019,000,000 |
| `c_cash_equ_end_period` | 756,527,000,000 |
| `prov_depr_assets` | 43,608,000,000 |
| `depr_fa_coga_dpba` | 10,803,000,000 |
| `amort_intang_assets` | 862,000,000 |
| `lt_amort_deferred_exp` | 896,000,000 |
| `loss_disp_fiolta` | -249,000,000 |
| `loss_fv_chg` | -11,306,000,000 |
| `invest_loss` | -28,656,000,000 |
| `decr_oper_payable` | -551,049,000,000 |
| `incr_oper_payable` | 908,289,000,000 |
| `im_net_cashflow_oper_act` | 447,023,000,000 |
| `im_n_incr_cash_equ` | 157,508,000,000 |
| `use_right_asset_dep` | 3,925,000,000 |
| `end_bal_cash` | 16,622,000,000 |
| `beg_bal_cash` | 14,931,000,000 |
| `end_bal_cash_equ` | 739,905,000,000 |
| `beg_bal_cash_equ` | 584,088,000,000 |
| `update_flag` | 1.00 |

### fina_indicator（60 个非空字段）

| 字段 | 值 |
|---|---:|
| `ts_code` | 600036.SH |
| `ann_date` | 20,250,326.00 |
| `end_date` | 20,241,231.00 |
| `eps` | 5.66 |
| `dt_eps` | 5.66 |
| `total_revenue_ps` | 13.38 |
| `revenue_ps` | 13.38 |
| `capital_rese_ps` | 2.59 |
| `surplus_rese_ps` | 4.86 |
| `undist_profit_ps` | 25.14 |
| `extra_item` | 380,000,000 |
| `profit_dedt` | 148,011,000,000 |
| `assets_turn` | 0.0291 |
| `op_income` | 131,944,000,000 |
| `retained_earnings` | 756,730,000,000 |
| `diluted2_eps` | 5.88 |
| `bps` | 41.46 |
| `ocfps` | 17.73 |
| `retainedps` | 30.01 |
| `cfps` | 6.25 |
| `netprofit_margin` | 44.32 |
| `profit_to_gr` | 44.32 |
| `adminexp_of_gr` | 31.89 |
| `op_of_gr` | 53.04 |
| `roe` | 12.89 |
| `roe_waa` | 14.49 |
| `roe_dt` | 12.86 |
| `npta` | 1.29 |
| `roe_yearly` | 12.89 |
| `debt_to_assets` | 89.85 |
| `assets_to_eqt` | 9.85 |
| `dp_assets_to_eqt` | 10.07 |
| `debt_to_eqt` | 8.85 |
| `eqt_to_debt` | 0.1123 |
| `ocf_to_debt` | 0.0409 |
| `roa_yearly` | 1.29 |
| `roa_dp` | 1.28 |
| `fixed_assets` | 128,933,000,000 |
| `profit_to_op` | 52.94 |
| `q_roe` | 2.96 |
| `q_dt_roe` | 2.94 |
| `q_npta` | 0.2984 |
| `q_ocf_to_sales` | 188.48 |
| `basic_eps_yoy` | 0.5329 |
| `dt_eps_yoy` | 0.5329 |
| `cfps_yoy` | 24.91 |
| `op_yoy` | 1.33 |
| `ebt_yoy` | 1.15 |
| `netprofit_yoy` | 1.22 |
| `dt_netprofit_yoy` | 1.34 |
| `ocf_yoy` | 24.95 |
| `roe_yoy` | -11.13 |
| `bps_yoy` | 12.94 |
| `assets_yoy` | 10.19 |
| `eqt_yoy` | 13.90 |
| `tr_yoy` | -0.4821 |
| `or_yoy` | -0.4821 |
| `q_sales_yoy` | 7.53 |
| `q_op_qoq` | 0.7256 |
| `equity_yoy` | 13.90 |

## BenchmarkIQ 字段 vs Tushare 映射


### 盈利

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `roa` | 总资产收益率 | `fina_indicator.roa` | ✓ 直接映射 |
| `roe` | 净资产收益率 | `fina_indicator.roe` | ✓ 直接映射 |
| `netProfit` | 净利润 | `income.n_income / income.income_attr_p` | ✓ 直接映射 |
| `netProfitGrowth` | 净利润增速 | `fina_indicator.netprofit_yoy 或自行计算` | ✓ 直接映射 |
| `ppop` | 拨备前利润 | `需推导: income.total_profit + income.assets_impair_loss` | 🔧 需推导 |
| `ppopGrowth` | 拨备前利润增速 | `需推导，由 ppop 自行计算 yoy` | 🔧 需推导 |
| `revenue` | 营业收入 | `income.revenue` | ✓ 直接映射 |
| `revenueGrowth` | 营业收入增速 | `fina_indicator.tr_yoy` | ✓ 直接映射 |
| `coreRevenue` | 核心营收 | `需推导: 利息净收入 + 手续费净收入` | 🔧 需推导 |
| `coreRevenueGrowth` | 核心营收增速 | `需推导` | 🔧 需推导 |
| `basicEps` | 基本每股收益 | `fina_indicator.eps` | ✓ 直接映射 |

### 息差

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `nim` | 净息差 | `需推导: 利息净收入 / 平均生息资产 (Tushare 无现成 NIM 字段)` | 🔧 需推导 |
| `earningAssets` | 生息资产 | `需从 balancesheet 多字段推导` | 🔧 需推导 |
| `earningAssetYield` | 生息资产收益率 | `需推导` | 🔧 需推导 |
| `interestLiabilities` | 计息负债 | `需推导` | 🔧 需推导 |
| `interestLiabilityCost` | 计息负债成本率 | `需推导` | 🔧 需推导 |
| `netInterestIncome` | 利息净收入 | `income.n_oth_int_inc 或 int_income - int_exp` | ✓ 直接映射 |
| `interestIncome` | 利息收入 | `income.int_income` | ✓ 直接映射 |
| `interestExpense` | 利息支出 | `income.int_exp` | ✓ 直接映射 |

### 非息

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `feeIncome` | 手续费及佣金净收入 | `income.n_commis_income` | ✓ 直接映射 |
| `feeRevenueShare` | 手续费收入占比 | `需推导: n_commis_income / revenue` | 🔧 需推导 |
| `nonInterestShare` | 非息收入占比 | `需推导` | 🔧 需推导 |
| `netInterestRevenueShare` | 利息净收入占比 | `需推导` | 🔧 需推导 |
| `trueCoreNonInterest` | 真实核心非息占比 | `需推导` | 🔧 需推导 |
| `volatileIncomeShare` | 高波动收入占比 | `需推导` | 🔧 需推导 |

### 资产负债

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `assets` | 总资产 | `balancesheet.total_assets` | ✓ 直接映射 |
| `liabilities` | 总负债 | `balancesheet.total_liab` | ✓ 直接映射 |
| `equity` | 股东权益 | `balancesheet.total_hldr_eqy_inc_min_int` | ✓ 直接映射 |
| `loans` | 发放贷款和垫款 | `需 balancesheet 推导 (Tushare 字段非银行专属命名)` | 🔧 需推导 |
| `deposits` | 吸收存款 | `需 balancesheet 推导` | 🔧 需推导 |
| `assetGrowth` | 总资产增速 | `fina_indicator.assets_yoy` | ✓ 直接映射 |
| `assetsChange` | 总资产变化 | `自行计算` | ✓ 直接映射 |
| `loanAssetRatio` | 贷款/资产 | `需推导` | 🔧 需推导 |
| `depositLiabilityRatio` | 存款/负债 | `需推导` | 🔧 需推导 |

### 资本

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `cet1` | 核心一级资本充足率 | `❌ Tushare 三大报表不直接披露，需年报附注或手工` | ❌ 缺失 |
| `cet1Change` | 核心一级资本变化 | `需推导` | 🔧 需推导 |
| `carBuffer` | 资本充足率余量 | `❌ 同上` | ❌ 缺失 |
| `estimatedRwa` | 估算风险加权资产 | `❌ 同上，可用代理` | ❌ 缺失 |
| `rwaDensity` | RWA密度 | `❌ 需 RWA + 总资产` | ❌ 缺失 |

### 资产质量

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `npl` | 不良率 | `❌ 银行年报独立披露，Tushare 三大报表无` | ❌ 缺失 |
| `provisionCoverage` | 拨备覆盖率 | `❌ 同上` | ❌ 缺失 |
| `overdueRatio` | 逾期贷款率 | `❌ 同上` | ❌ 缺失 |
| `specialMentionRatio` | 关注类贷款占比 | `❌ 同上` | ❌ 缺失 |
| `provisionCoverageChange` | 拨备覆盖率变化 | `❌` | ❌ 缺失 |
| `overdueNplDeviation` | 逾期不良偏离度 | `❌` | ❌ 缺失 |
| `hiddenNplExposure` | 隐性不良暴露率 | `❌ 需逾期数据` | ❌ 缺失 |
| `retailRiskMax` | 零售最高分项不良率 | `❌ 需细分披露` | ❌ 缺失 |

### 市场估值

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `pb` | 年末市净率 | `daily_basic.pb` | ✓ 直接映射 |
| `pbMid` | 年中市净率 | `daily_basic 取 6 月底` | ✓ 直接映射 |
| `theoreticalPb` | DDM 理论 PB | `需自建 DDM 模型` | ✓ 直接映射 |
| `pbDiscount` | PB 估值偏离 | `需推导` | 🔧 需推导 |
| `economicProfit` | 经济利润 | `需推导: 净利润 - 权益 × 资本成本` | 🔧 需推导 |

### 成本效率

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `costIncomeRatio` | 成本收入比 | `需推导: 业务及管理费 / 营业收入` | 🔧 需推导 |
| `adminExpense` | 管理费用 | `income.biz_tax_surchg 或 oper_exp` | ✓ 直接映射 |
| `adminAssetRatio` | 管理费用/资产 | `需推导` | 🔧 需推导 |
| `cashProfitRatio` | 经营现金流/净利润 | `需推导` | 🔧 需推导 |
| `operatingCashFlow` | 经营活动现金流净额 | `cashflow.n_cashflow_act` | ✓ 直接映射 |

### 存款细分

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `corporateDeposit` | 公司存款 | `❌ 银行年报存款分项` | ❌ 缺失 |
| `personalDeposit` | 个人存款 | `❌` | ❌ 缺失 |
| `demandDepositShare` | 活期存款占比 | `❌` | ❌ 缺失 |
| `timeDepositShare` | 定期存款占比 | `❌` | ❌ 缺失 |

### 贷款细分

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `corporateLoanNpl` | 对公贷款不良率 | `❌` | ❌ 缺失 |
| `personalLoanNpl` | 个贷不良率 | `❌` | ❌ 缺失 |
| `housingLoanShare` | 住房贷款占比 | `❌` | ❌ 缺失 |
| `consumerLoanShare` | 消费贷款占比 | `❌` | ❌ 缺失 |
| `businessLoanShare` | 经营贷款占比 | `❌` | ❌ 缺失 |

### 其他

| BenchmarkIQ 字段 | 中文名 | Tushare 来源 | 状态 |
|---|---|---|---|
| `investmentAssetRatio` | 债券基金信托理财/资产 | `需 balancesheet 推导` | 🔧 需推导 |
| `bondInvestment` | 债券投资 | `balancesheet 推导` | 🔧 需推导 |
| `liquidityRatio` | 流动性比率 | `❌ 监管报表` | ❌ 缺失 |
| `liquidityCoverageRatio` | 流动性覆盖率 | `❌ 监管报表` | ❌ 缺失 |

### 映射缺口统计

| 状态 | 数量 | 占比 |
|---|---:|---:|
| ✓ 直接映射 | 21 | 30% |
| 🔧 需推导 | 26 | 37% |
| ❌ 缺失 | 23 | 33% |
| **总计** | **70** | 100% |


## 覆盖矩阵

### balancesheet：42 银行 × 23 期，覆盖率 99.5%

**数据缺最多的 10 家银行**：

| ts_code | 缺失期数 / 总期数 |
|---|---:|
| 601528.SH | 3 / 23 |
| 601825.SH | 2 / 23 |

### income：42 银行 × 23 期，覆盖率 100.0%

✓ 所有银行的所有期间都有数据。

### cashflow：42 银行 × 23 期，覆盖率 99.8%

**数据缺最多的 10 家银行**：

| ts_code | 缺失期数 / 总期数 |
|---|---:|
| 001227.SZ | 2 / 23 |

### fina_indicator：42 银行 × 24 期，覆盖率 100.0%

✓ 所有银行的所有期间都有数据。

