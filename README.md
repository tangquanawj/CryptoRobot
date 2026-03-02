# Crypto Monitor Pro

## 项目介绍

Crypto Monitor Pro 是一个基于 Node.js 的加密货币监控机器人，通过飞书消息推送实时市场数据，帮助用户快速了解加密货币市场动态。

## 技术栈

- **编程语言**：Node.js
- **主要依赖**：
  - axios：用于发送 HTTP 请求，获取加密货币价格和数据
  - chartjs-node-canvas：用于生成价格图表（目前已暂时禁用，以避免飞书 API 错误）

## 安装说明

1. 克隆项目到本地：
   ```bash
   git clone <repository-url>
   cd crypto-monitor-pro
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

## 配置说明

项目需要配置以下环境变量：

- `FEISHU_WEBHOOK`：飞书机器人的 Webhook URL
- `FEISHU_SECRET`：飞书机器人的密钥

在本地运行时，可以通过创建 `.env` 文件来设置这些环境变量：

```env
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
FEISHU_SECRET=xxx
```

在 GitHub Actions 中运行时，需要在仓库的 **Settings > Secrets and variables > Actions** 中添加这些密钥。

## 功能说明

### 1. 多币种监控

- **核心监控池**：BTC、ETH、XRP、SOL、DOGE、ADA、LINK、AVAX、DOT、UNI
- **轮动热点池**：SUI、NEAR、APT、RNDR、ARB、FET、INJ、OP、MATIC、ATOM
- 显示 24 小时涨跌幅，避免误解

### 2. 专业指标

- **BTC 资金费率**：使用 OKX API 获取 BTC/USDT 永续合约的资金费率
- **恐慌指数**：使用 Alternative.me API 获取加密货币市场的恐慌指数

### 3. 智能提醒

- 当核心币波动超过 5% 时，自动发送警报

### 4. 持仓总价值计算

- 根据预设的持仓数量，自动计算总价值

## 使用方法

### 本地运行

```bash
node scripts/crypto.js
```

### 定时运行

项目配置了 GitHub Actions 工作流，每天自动运行两次（UTC 时间 1:00 和 13:00，对应北京时间 9:00 和 21:00）。

工作流配置文件：`.github/workflows/crypto-pro.yml`

## 维护指南

### 添加新币种

1. 在 `scripts/crypto.js` 文件中，找到 `coinSymbols` 对象，添加新币种的映射：
   ```javascript
   const coinSymbols = {
     // 现有币种...
     "new-coin": "NEW"
   };
   ```

2. 在 `coreCoins` 或 `rotationCoins` 数组中添加新币种的 ID：
   ```javascript
   const coreCoins = ["bitcoin", "ethereum", ..., "new-coin"];
   // 或
   const rotationCoins = ["sui", "near", ..., "new-coin"];
   ```

3. 如果需要在持仓计算中包含新币种，在 `holdings` 对象中添加持仓数量：
   ```javascript
   const holdings = {
     // 现有持仓...
     "new-coin": 10
   };
   ```

### 修改监控频率

修改 `.github/workflows/crypto-pro.yml` 文件中的 `cron` 表达式：

```yaml
on:
  schedule:
    - cron: "0 1,13 * * *"  # 每天 UTC 时间 1:00 和 13:00 运行
```

### 调整波动警报阈值

修改 `scripts/crypto.js` 文件中的阈值：

```javascript
if (Math.abs(change) >= 5) alert += `⚠ ${symbol} 核心币波动超过5%\n`;
```

## 故障排查

### 1. 飞书 API 错误

- **错误信息**：`ErrCode: 200621; ErrMsg: parse card json err...`
- **解决方案**：检查 JSON 格式是否正确，避免 Base64 字符串过长（目前已暂时禁用图表功能）

### 2. API 频率限制

- **错误信息**：`frequency limited psm[lark.oapi.app_platform_runtime]`
- **解决方案**：代码中已添加 1 秒延迟，避免请求过于频繁

### 3. 币数据获取失败

- **错误信息**：`Error fetching tickers: Request failed with status code 429`
- **解决方案**：使用批量请求，减少 API 调用次数

### 4. 网络连接问题

- **错误信息**：`Error: connect ECONNREFUSED`
- **解决方案**：检查网络连接，确保能够访问外部 API

## 项目结构

```
├── .github/
│   └── workflows/
│       └── crypto-pro.yml  # GitHub Actions 工作流配置
├── scripts/
│   └── crypto.js          # 主脚本
├── .gitignore             # Git 忽略文件
├── package.json           # 项目配置和依赖
└── README.md              # 项目说明文档
```

## 版本历史

- **v2.0.0**：
  - 切换到 CoinGecko API
  - 添加 BTC 资金费率（使用 OKX API）
  - 添加恐慌指数
  - 优化飞书消息格式
  - 暂时禁用图表功能以避免飞书 API 错误

- **v1.0.0**：
  - 初始版本，使用 OKX API
  - 基本的价格监控和飞书推送功能

## 许可证

MIT
