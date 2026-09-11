# 3D 模型目录

把正式模型转换为 GLB 后放在本目录：

- `uav.glb`：无人机
- `awacs.glb`：预警机
- `ship.glb`：舰船
- `ground-station.glb`：地面站/雷达站
- `training-center.glb`：训练中心建筑

缺失文件不会导致页面崩溃，场景会自动使用内置低模占位体。

建议先在 Blender 中统一：Y 轴向上、缩放应用、模型原点居中、删除不可见对象、合并重复材质、贴图压缩到 2K，并导出 glTF 2.0 Binary (`.glb`)。
