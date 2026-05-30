# 数据治理产物说明

本目录用于承接董办对标分析工具的数据底座，所有文件由 `../build_data_governance.py` 从基础 Excel 和 `../analysis_rules.json` 生成。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| `metric_dictionary.csv` / `metric_dictionary.json` | 指标字典，定义指标编码、名称、主题、方向、单位、来源字段、公式、缺失值处理和是否参与预警。 |
| `bank_master.csv` / `bank_master.json` | 银行主数据，定义银行 ID、简称、别名、类型、区域、年份覆盖、资产规模分层和默认对标资格。 |
| `data_quality_rules.json` | 数据质量校验规则，包括必需字段、唯一性、完整性、取值范围、一致性和缺失值兜底策略。 |
| `data_quality_issues.csv` / `data_quality_issues.json` | 校验发现的问题清单。当前为空表示未发现 error/warning。 |
| `data_quality_report.md` | 给业务和项目团队阅读的校验摘要。 |

## 重跑方式

在项目根目录运行：

```bash
python3 outputs/vqa_template/build_data_governance.py
```

重跑后会覆盖本目录下的生成文件。

## 当前限制

- 银行全称、股票代码、上市地字段当前 Excel 未提供，主数据中先保留为空。
- 国有大行和股份行区域默认保留为“全国”；城商行、农商行优先按注册地或主要经营地映射到华东、华北、华南、东北、中西。
- 当前校验是基础规则版本，后续可以增加跨期异常、同比跳变、公式回算误差和上传人/版本号校验。
