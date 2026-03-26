// 圆形迷宫数据定义

export interface RoomDef {
  id: string;
  name: string;
  color: string;
  initialAngle: number; // 中心角度，0°=12点钟，顺时针
  halfWidth: number;    // 角宽度的一半（度）
  nightAccessible: boolean; // 夜间（20:00-7:00）是否可通行
  ring: 1 | 2 | 3 | 4;
}

// SVG 中心坐标与各圈半径
export const CX = 290;
export const CY = 290;

export const RADII = {
  R1: { out: 278, inn: 205, mid: 241 },
  R2: { out: 205, inn: 135, mid: 170 },
  R3: { out: 135, inn: 68,  mid: 101 },
  R4: { out: 68,  inn: 0,   mid: 34  },
};

// 第一圈：4个房间，每间90°
export const RING1: RoomDef[] = [
  { id: 'summer', name: '夏', color: '#3B82F6', initialAngle: 0,   halfWidth: 44, nightAccessible: false, ring: 1 },
  { id: 'autumn', name: '秋', color: '#F97316', initialAngle: 90,  halfWidth: 44, nightAccessible: true,  ring: 1 },
  { id: 'winter', name: '冬', color: '#94A3B8', initialAngle: 180, halfWidth: 44, nightAccessible: false, ring: 1 },
  { id: 'spring', name: '春', color: '#22C55E', initialAngle: 270, halfWidth: 44, nightAccessible: true,  ring: 1 },
];

// 第二圈：12个房间，每间30°
// 土象=黄色系  水象=蓝色系  风象=绿色系  火象=红色系
export const RING2: RoomDef[] = [
  { id: 'virgo',       name: '处女', color: '#CA8A04', initialAngle: 0,   halfWidth: 14, nightAccessible: false, ring: 2 }, // 土
  { id: 'aquarius',   name: '水瓶', color: '#10B981', initialAngle: 30,  halfWidth: 14, nightAccessible: false, ring: 2 }, // 风
  { id: 'scorpio',    name: '天蝎', color: '#2563EB', initialAngle: 60,  halfWidth: 14, nightAccessible: false, ring: 2 }, // 水
  { id: 'cancer',     name: '巨蟹', color: '#3B82F6', initialAngle: 90,  halfWidth: 14, nightAccessible: false, ring: 2 }, // 水
  { id: 'capricorn',  name: '摩羯', color: '#D97706', initialAngle: 120, halfWidth: 14, nightAccessible: false, ring: 2 }, // 土
  { id: 'libra',      name: '天秤', color: '#34D399', initialAngle: 150, halfWidth: 14, nightAccessible: false, ring: 2 }, // 风
  { id: 'pisces',     name: '双鱼', color: '#60A5FA', initialAngle: 180, halfWidth: 14, nightAccessible: false, ring: 2 }, // 水
  { id: 'aries',      name: '白羊', color: '#F87171', initialAngle: 210, halfWidth: 14, nightAccessible: false, ring: 2 }, // 火
  { id: 'leo',        name: '狮子', color: '#EF4444', initialAngle: 240, halfWidth: 14, nightAccessible: true,  ring: 2 }, // 火
  { id: 'taurus',     name: '金牛', color: '#EAB308', initialAngle: 270, halfWidth: 14, nightAccessible: false, ring: 2 }, // 土
  { id: 'gemini',     name: '双子', color: '#4ADE80', initialAngle: 300, halfWidth: 14, nightAccessible: false, ring: 2 }, // 风
  { id: 'sagittarius',name: '射手', color: '#FB923C', initialAngle: 330, halfWidth: 14, nightAccessible: false, ring: 2 }, // 火
];

// 第三圈：6个房间，每间60°
export const RING3: RoomDef[] = [
  { id: 'M', name: 'M', color: '#92816A', initialAngle: 0,   halfWidth: 29, nightAccessible: false, ring: 3 }, // 暖褐
  { id: 'H', name: 'H', color: '#C8906A', initialAngle: 60,  halfWidth: 29, nightAccessible: false, ring: 3 }, // 杏色
  { id: 'G', name: 'G', color: '#A0695A', initialAngle: 120, halfWidth: 29, nightAccessible: true,  ring: 3 }, // 玫瑰褐
  { id: 'C', name: 'C', color: '#CA8A04', initialAngle: 180, halfWidth: 29, nightAccessible: false, ring: 3 }, // 金黄
  { id: 'P', name: 'P', color: '#64748B', initialAngle: 240, halfWidth: 29, nightAccessible: false, ring: 3 }, // 灰蓝
  { id: 'E', name: 'E', color: '#4E8AA0', initialAngle: 300, halfWidth: 29, nightAccessible: false, ring: 3 }, // 钢蓝
];

// 第四圈：只有一个房间——祭祀台，初始位于240°
export const RING4: RoomDef = {
  id: 'altar', name: '祭祀台', color: '#7C3AED', initialAngle: 240, halfWidth: 180, nightAccessible: true, ring: 4,
};

// 夜间可通行的房间ID集合
export const NIGHT_IDS = new Set(['spring', 'autumn', 'leo', 'G', 'altar']);
