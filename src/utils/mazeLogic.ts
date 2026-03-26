// 迷宫逻辑：旋转计算、连通判断

import { RING1, RING2, RING3, RING4, RADII, NIGHT_IDS, type RoomDef } from './mazeData';

export interface RingState {
  angle: number;       // 旋转角度（SVG坐标，正=顺时针，负=逆时针）
  isRotating: boolean; // 是否正在旋转（旋转中=锁门）
}

// 角度归一化到 [0, 360)
export function normAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

// 判断两个角度是否近似相等（容差1°）
function angMatch(a: number, b: number): boolean {
  const d = Math.abs(normAngle(a) - normAngle(b));
  return d < 1 || d > 359;
}

/**
 * 根据时间（分钟，0=午夜00:00）计算各圈旋转状态
 *
 * 圈1（顺时针，每小时内）：
 *   n:00–n:14 静止 | n:15–n:29 旋转90° | n:30–n:44 静止 | n:45–n:59 旋转90°
 *   → 每小时转180°，2小时一圈
 *
 * 圈2/3/4（每小时内）：
 *   n:00–n:09 静止 | n:10–n:19 旋转30° | n:20–n:29 静止 |
 *   n:30–n:39 旋转30° | n:40–n:49 静止 | n:50–n:59 旋转30°
 *   → 每小时转90°，4小时一圈（圈2/4逆时针，圈3顺时针）
 */
export function getRingState(t: number, ring: 1 | 2 | 3 | 4): RingState {
  const hour = Math.floor(t / 60);
  const w = t % 60; // 本小时内已过分钟数

  if (ring === 1) {
    // 累计基础角度：每整小时贡献 2×90° = 180°
    const base = hour * 180;
    let extra: number;
    let isRotating: boolean;
    if (w < 15) {
      extra = 0; isRotating = false;
    } else if (w < 30) {
      extra = ((w - 15) / 15) * 90; isRotating = true;
    } else if (w < 45) {
      extra = 90; isRotating = false;
    } else {
      extra = 90 + ((w - 45) / 15) * 90; isRotating = true;
    }
    return { angle: base + extra, isRotating };
  }

  // 圈2/3/4：累计基础角度：每整小时贡献 3×30° = 90°
  const base = hour * 90;
  let extra: number;
  let isRotating: boolean;
  if (w < 10) {
    extra = 0; isRotating = false;
  } else if (w < 20) {
    extra = ((w - 10) / 10) * 30; isRotating = true;
  } else if (w < 30) {
    extra = 30; isRotating = false;
  } else if (w < 40) {
    extra = 30 + ((w - 30) / 10) * 30; isRotating = true;
  } else if (w < 50) {
    extra = 60; isRotating = false;
  } else {
    extra = 60 + ((w - 50) / 10) * 30; isRotating = true;
  }
  const angle = base + extra;
  // 圈3顺时针（正），圈2/4逆时针（负）
  return { angle: ring === 3 ? angle : -angle, isRotating };
}

/** 判断是否为夜间（20:00–07:00） */
export function isNightTime(t: number): boolean {
  const m = t % 1440;
  return m < 420 || m >= 1200;
}

/** 判断单个房间是否被锁定 */
export function isRoomLocked(room: RoomDef, isNight: boolean, ringRotating: boolean): boolean {
  if (ringRotating) return true;
  if (isNight && !NIGHT_IDS.has(room.id)) return true;
  return false;
}

export interface Connection {
  room1: RoomDef;
  room2: RoomDef;
  globalAngle: number; // 连通处的全局角度
  boundaryR: number;   // 两圈边界半径
  locked: boolean;     // 连通但锁门（夜间或其中一间上锁）
}

/**
 * 计算当前时刻所有相邻圈间的几何连通关系
 * 连通条件：两圈均已停止旋转 + 房间处于同一角度
 */
export function getConnections(
  s1: RingState, s2: RingState, s3: RingState, s4: RingState,
  isNight: boolean,
): Connection[] {
  const result: Connection[] = [];

  // 圈1 ↔ 圈2（边界 r=205）
  if (!s1.isRotating && !s2.isRotating) {
    for (const r1 of RING1) {
      for (const r2 of RING2) {
        const g1 = normAngle(r1.initialAngle + s1.angle);
        const g2 = normAngle(r2.initialAngle + s2.angle);
        if (angMatch(g1, g2)) {
          const locked = isNight && (!r1.nightAccessible || !r2.nightAccessible);
          result.push({ room1: r1, room2: r2, globalAngle: g1, boundaryR: RADII.R2.out, locked });
        }
      }
    }
  }

  // 圈2 ↔ 圈3（边界 r=135）
  if (!s2.isRotating && !s3.isRotating) {
    for (const r2 of RING2) {
      for (const r3 of RING3) {
        const g2 = normAngle(r2.initialAngle + s2.angle);
        const g3 = normAngle(r3.initialAngle + s3.angle);
        if (angMatch(g2, g3)) {
          const locked = isNight && (!r2.nightAccessible || !r3.nightAccessible);
          result.push({ room1: r2, room2: r3, globalAngle: g2, boundaryR: RADII.R3.out, locked });
        }
      }
    }
  }

  // 圈3 ↔ 圈4（边界 r=68）
  if (!s3.isRotating && !s4.isRotating) {
    for (const r3 of RING3) {
      const g3 = normAngle(r3.initialAngle + s3.angle);
      const g4 = normAngle(RING4.initialAngle + s4.angle);
      if (angMatch(g3, g4)) {
        const locked = isNight && (!r3.nightAccessible || !RING4.nightAccessible);
        result.push({ room1: r3, room2: RING4, globalAngle: g3, boundaryR: RADII.R4.out, locked });
      }
    }
  }

  return result;
}

/** 从连通列表中构建完整路径（如 夏→处女→M） */
export function buildPaths(connections: Connection[]): { path: string; locked: boolean }[] {
  const r12 = connections.filter(c => c.room1.ring === 1);
  const r23 = connections.filter(c => c.room1.ring === 2 && c.room2.ring === 3);
  const r34 = connections.filter(c => c.room1.ring === 3);
  const r23standalone = connections.filter(c => c.room1.ring === 2 && c.room2.ring === 3);

  const paths: { path: string; locked: boolean }[] = [];
  const usedR2inChain = new Set<string>();

  for (const c12 of r12) {
    let path = `${c12.room1.name} → ${c12.room2.name}`;
    let locked = c12.locked;
    const c23 = r23.find(c => c.room1.id === c12.room2.id);
    if (c23) {
      usedR2inChain.add(c23.room1.id);
      path += ` → ${c23.room2.name}`;
      locked = locked || c23.locked;
      const c34 = r34.find(c => c.room1.id === c23.room2.id);
      if (c34) {
        path += ` → ${c34.room2.name}`;
        locked = locked || c34.locked;
      }
    }
    paths.push({ path, locked });
  }

  // 独立的圈2→圈3连通（不在圈1链中的）
  for (const c23 of r23standalone) {
    if (!usedR2inChain.has(c23.room1.id)) {
      let path = `${c23.room1.name} → ${c23.room2.name}`;
      let locked = c23.locked;
      const c34 = r34.find(c => c.room1.id === c23.room2.id);
      if (c34) {
        path += ` → ${c34.room2.name}`;
        locked = locked || c34.locked;
      }
      paths.push({ path, locked });
    }
  }

  return paths;
}

/** 获取某个房间当前的全局角度 */
export function roomGlobalAngle(room: RoomDef, ringAngle: number): number {
  return normAngle(room.initialAngle + ringAngle);
}
