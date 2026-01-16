## MVP Sim CLI

运行方式（示例）：

1. 构建
```
npm run build
```

2. 执行样例
```
node apps/server/dist/cli.js
```

3. 指定意图
```
node apps/server/dist/cli.js --intent "{\"action\":\"send\",\"chain\":\"sepolia\",\"asset\":\"ETH\",\"amount\":\"0.1\",\"to\":\"0x1111111111111111111111111111111111111111\"}"
```

4. 指定样例索引
```
node apps/server/dist/cli.js --sample-index 2
```

日志输出：
- `experiments/logs/`
