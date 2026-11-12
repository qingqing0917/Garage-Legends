# 车型目录来源

- 页面：[List of sports cars](https://en.wikipedia.org/wiki/List_of_sports_cars)，Wikipedia contributors。
- 读取日期：2026-11-07（Asia/Shanghai）；页面显示最后编辑日期 2026-11-03 14:26 UTC。
- 使用页面主表 1,994 行，纳入符合车身类型和年份规则的 1,828 行，共 398 个品牌。未读取 SUV、皮卡、运动配置和外部改装商的附表来增加条目数。
- 仅保留品牌、车型名称、年份、车身类别、产地、概念车标记和已存在的车型资料链接；没有复制页面备注段落或图片。若原条目没有独立链接，指向来源总表。
- 已进行空白规范化、引用标记移除、稳定 ID 生成和过滤。源表中年代或命名可能不准确；并非厂家官方数据，不保证所有条目均已量产。
- `data/vehicle-catalog.json` 是导入事实数据；`data/catalog-audit.json` 记录数量和排除原因。
- Wikipedia 页面采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。本目录的改编与归属按该许可提供。页面作者及历史可通过[页面历史](https://en.wikipedia.org/w/index.php?title=List_of_sports_cars&action=history)查看。

0.11 新增来源：[SUV 车型表](https://en.wikipedia.org/wiki/List_of_sport_utility_vehicles)、[轿车分类](https://en.wikipedia.org/wiki/Category:Sedans)和[运动轿车分类](https://en.wikipedia.org/wiki/Category:Sports_sedans)，Wikipedia contributors，读取日期 2026-11-07。使用 SUV 现产及停产两张表，不含军用表；轿车条目取分类下的页面标题。经品牌识别、按品牌和车型去重、排除明确晚于 2026 年的车型后，补充 1,273 条轿车、1,374 条 SUV、62 条越野车。越野分类依据名称和类别关键词推断，可能有误；轿车分类不含生产年份时显示「年代未核实」。同一车系或年款可能有多个条目，不代表完整全球车型库。

`data/family-catalog.json` 和 `data/family-catalog-audit.json` 保存本次快照和统计，`scripts/import-family-catalog.py` 可在安装 `requests` 与 `beautifulsoup4` 后重新生成。新增来源按 CC BY-SA 4.0 提供；参见各页面的历史记录。

2026-11-08 新增 `data/global-catalog.json`：从 Wikipedia 两厢车、旅行车、皮卡、MPV、厢式车、双门轿跑和敞篷车分类的车型页面标题补充 1,409 条。导入只接受以现有品牌名开头的标题，按品牌和车型去重，并保留每条页面链接；来源分类及数量见 `data/global-catalog-audit.json`。这些页面遵循各自的 Wikipedia 许可和署名要求；页面历史可从每条资料链接访问。分类和品牌识别可能有误，条目未核实生产年代；皮卡、厢式车等采用现有简化车身，不是逐款车辆的原厂造型。`scripts/import-global-catalog.py` 可通过 Wikipedia API 继续增补，并保留之前导入的 ID。

# 游戏模型与性能

3D 模型由本项目代码生成。0.11 在原有跑车设计上加入轿车、SUV、越野车共 26 种设计语言，并为 720S 风格细化灯组和中置动力舱；其他条目按车系和稳定型号产生比例与细节变化。同车系仍共享设计语言，没有下载厂商 CAD、车标或付费模型，不宣称逐车型精确复刻。收藏馆缩略图由同一套模型在本地渲染（R-86 保留旧侧影），未使用厂家车型照片。V 形发动机和电驱总成为游戏化示意，不保证逐款车型配置准确。

目录车型的马力、质量、抓地、制动和速度上限为游戏设定；不应被当作真实车辆参数。原有 R-86 和 AERO S1 为游戏原创车型。车型名称用于在收藏馆中识别目录条目。

0.8 新增的特殊车门和折叠顶为本项目的程序化游戏机构。按车型家族配置鸥翼门、剪刀门、蝴蝶门、旋翼门和普通侧开门；目录中敞篷 / Roadster / Spider / Targa 等类型使用可切换的统一分段硬顶。此特征映射并非原厂配置数据库，折叠结构和运动轨迹不宣称与实车逐一相同。AERO S1 的剪刀门与可开合车顶为原创设计。
