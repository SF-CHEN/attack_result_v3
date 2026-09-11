# 智能攻击态势展示系统

Vue 3 + TypeScript + Vite + Three.js + GSAP + Pinia 实现的电影化态势展示大屏。

## 当前已完成

- 登录页 → 中国地图首页 → 态势主页基础流程
- 顶部地面 1-11 / 空中 1-8 模拟步骤
- 左右功能入口与抽屉面板
- 底部六阶段任务时间轴
- Three.js 海陆空基础场景、Bloom、Tone Mapping、雾、动态海面、星点环境
- 无人机、预警机、舰船、训练中心、地面站等 3D 占位模型
- 数据流粒子、模型下发链路、目标识别锥、目标锁定圈
- AnimationDirector：步骤只负责编排，不直接操作业务 DOM
- 样本数据按方法增量追加，步骤切换不会自动清空
- GLB/GLTF 自动加载失败时回退到内置几何体，因此没有正式模型也可以先跑通流程

## 本地运行

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run typecheck
npm run build
```

## 3D 模型约定

把下载后的模型统一放入 `public/models/`，并使用以下文件名：

```text
public/models/
├─ uav.glb
├─ awacs.glb
├─ ship.glb
├─ ground-station.glb
└─ training-center.glb
```

如果某个文件不存在，页面会自动使用低模占位体，不阻塞开发。

模型建议：

- glTF 2.0 / GLB
- 单个核心模型尽量控制在 5-15 MB
- Web 展示模型尽量低于 150k 三角面
- 贴图推荐 2K，特别近的主体可使用 4K
- 删除无关动画、碰撞体和隐藏模型
- 最好没有外国国旗、国家徽记、品牌水印
- 原点放在模型主体中心附近，并尽量统一 Y-up

## 动画架构

业务流程不直接操作 Three.js 对象。

```text
模拟按钮 / WebSocket
        ↓
   业务事件状态
        ↓
      Pinia
        ↓
AnimationDirector
        ↓
 Three.js + Vue HUD
```

`AnimationDirector` 负责镜头、数据链路、节点强调和识别过程；Vue 负责按钮、文字、结果面板和历史数据。

## 下一阶段

1. 替换正式 GLB 模型并校准比例、位置、朝向。
2. 增加真实地形/海岸远景或高质量场景底图。
3. 完整细化地面 1-11 每一步的独立演出时间线。
4. 完整细化空中 1-8 每一步的独立演出时间线。
5. 增加样本图片轮播、目标检测框数据映射、检测进度与准确率详情。
6. 接入 WebSocket，把真实系统消息转换为和模拟按钮完全一致的流程事件。
7. 最后统一优化镜头语言、动效节奏、音效和性能。
