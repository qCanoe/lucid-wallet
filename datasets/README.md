# 钱包任务数据集

本目录用于存放钱包任务数据集及其规范。

## 目录结构

```
datasets/
├── README.md
├── spec/               # 规范文件
│   ├── query.md        # 任务描述规范
│   ├── metadata.md     # 元信息规范
│   ├── constraints.md  # 约束规范
│   ├── tools.md        # 工具与环境规范
│   └── output.md       # 输出格式规范
└── data/               # 数据文件
    └── samples.jsonl   # 样例数据
```

## 规范说明

| 模块 | 文件 | 说明 |
|------|------|------|
| Query | [spec/query.md](spec/query.md) | 自然语言意图描述规范 |
| Metadata | [spec/metadata.md](spec/metadata.md) | 链、任务类型、难度、账户状态 |
| Constraints | [spec/constraints.md](spec/constraints.md) | 用户约束 + 系统安全约束 |
| Tools | [spec/tools.md](spec/tools.md) | Agent 可用的工具接口 |
| Output | [spec/output.md](spec/output.md) | 交易序列输出格式 |

## 数据格式

数据文件采用 JSONL 格式（每行一个 JSON 对象）：

```json
{"id":"001","query":"...","metadata":{...},"constraints":{...}}
```

## MVP 覆盖范围

当前阶段优先支持：
- `swap`：代币兑换
- `send`：转账
