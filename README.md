# 智能攻击态势展示系统

Vue 3 + TypeScript + Vite + Three.js + GSAP + Pinia 实现的电影化态势展示大屏。

## 当前已完成

- 登录页 → 中国地图首页 → 态势主页基础流程
- 顶部地面 1-11 / 空中 1-8 模拟步骤
- 左右功能入口与抽屉面板
- 底部六阶段任务时间轴
- Three.js 海陆空场景、Bloom、ACES Tone Mapping、雾、动态海面、地形起伏、夜景灯点和渐变天空
- 正式无人机、预警机、舰船、训练中心、地面站 GLB 已接入
- 正式模型加载后自动做尺寸归一化、中心点校准、地面锚定和基础朝向调整
- 数据流粒子、双层发光链路、目标识别锥、移动扫描环、舰船目标锁定框
- 节点告警/运行光环、训练能量环、qb 融合环、冲击波与轻微镜头震动
- AnimationDirector：步骤只负责编排，不直接操作业务 DOM
- Ground 1 / 4 / 5 / 6 已按电影镜头方式重点编排：数据污染 → 训练 → 双路模型下发 → 无人机识别/回传/预警机融合
- Ground 9 / 10 / 11 复用加固模型视觉语言，并区分绿色防御态
- 空中 1-8 已具备攻击、推理、机上检测和过滤后重推理的基础镜头编排
- 地面验证和空中验证的临时视觉链路互斥，不会混在同一次演示里
- HUD 增加低强度胶片颗粒、扫描纹理、边缘暗角和玻璃层次
- 样本数据按方法增量追加，步骤切换不会自动清空
- GLB 自动加载失败时回退到内置几何体，因此模型缺失也不会阻塞流程

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

## 已接入正式 3D 模型

当前适配：

- KJ-2000 AWACS → `awacs.glb`
- Wing Loong I UAV → `uav.glb`
- Type-055 Destroyer → `ship.glb`
- Radar Station - WIP → `ground-station.glb`
- Command Center → `training-center.glb`

模型完整署名与许可证见 [`THIRD_PARTY_ASSETS.md`](./THIRD_PARTY_ASSETS.md)。

运行时目录：

```text
public/models/
├─ uav.glb
├─ awacs.glb
├─ ship.glb
├─ ground-station.glb
└─ training-center.glb
```

如果某个文件不存在，页面会自动使用低模占位体，不阻塞开发。

### 从原始 Sketchfab ZIP 一键生成 GLB（Windows）

把五个下载包保持原文件名放到项目根目录的 `model-source/`：

```text
model-source/
├─ kj-2000_awacs.zip
├─ wing_loong_i_uav_war_thunder.zip
├─ type-055_destroyer.zip
├─ radar_station_-_wip.zip
└─ command_center.zip
```

然后执行：

```bash
npm run models:prepare
```

脚本会自动解压 `scene.gltf + scene.bin + textures`，并打包成可直接由 Three.js 加载的单文件 GLB 到 `public/models/`。

## 模型规范

- glTF 2.0 / GLB
- 单个核心模型尽量控制在 5-15 MB
- Web 展示模型尽量低于 150k 三角面
- 贴图推荐 2K，特别近的主体可使用 4K
- 删除无关动画、碰撞体和隐藏模型
- 最好没有外国国旗、国家徽记、品牌水印
- 模型单位无需强行统一，`modelRegistry.ts` 会在加载阶段自动归一化到场景尺度

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

`AnimationDirector` 负责镜头、数据链路、节点强调、能量状态和识别过程；Vue 负责按钮、文字、结果面板和历史数据。

## 当前优先调试镜头

为了先把视觉基准做对，优先看下面四个按钮：

```text
地面 1  数据污染开始
   ↓
地面 4  训练中心启动
   ↓
地面 5  模型双路下发
   ↓
地面 6  无人机识别舰船 + 数据回传 + qb 融合
```

这四段确定视觉节奏后，其余步骤主要复用已有镜头和特效积木。

## 下一阶段

1. 根据真实浏览器截图微调五个 GLB 的朝向、大小、位置和镜头构图。
2. 让 Vue HUD 标注随 3D 节点投影位置移动，进一步适配镜头推进。
3. 细化地面 2 / 3 / 7 / 8 的样本到达、链路锁定和检测完成演出。
4. 细化空中 2-7 的对抗样本攻击、机上检测和检测完成演出。
5. 增加真实样本图片轮播、目标检测框数据映射、后门标签和检测进度。
6. 接入 WebSocket，把真实系统消息转换为和模拟按钮完全一致的流程事件。
7. 最后统一做帧率优化、模型 LOD、贴图压缩和音效开关。
