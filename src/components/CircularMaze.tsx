import { useMemo } from 'react';
import {
  CX, CY, RADII, RING1, RING2, RING3, RING4,
  type RoomDef,
} from '../utils/mazeData';
import {
  getRingState, isNightTime, isRoomLocked, getConnections,
  normAngle, type RingState,
} from '../utils/mazeLogic';

// ── 坐标工具 ──────────────────────────────────────────────

/** 极坐标转SVG坐标，0°=12点钟，顺时针 */
function pXY(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** 绘制圆环扇区路径（顺时针从startDeg到endDeg） */
function arcPath(rO: number, rI: number, s: number, e: number): string {
  const span = ((e - s) + 360) % 360;
  const la = span > 180 ? 1 : 0;
  const p1 = pXY(rO, s), p2 = pXY(rO, e);
  const p3 = pXY(rI, e), p4 = pXY(rI, s);
  return [
    `M${p1.x.toFixed(2)},${p1.y.toFixed(2)}`,
    `A${rO},${rO},0,${la},1,${p2.x.toFixed(2)},${p2.y.toFixed(2)}`,
    `L${p3.x.toFixed(2)},${p3.y.toFixed(2)}`,
    `A${rI},${rI},0,${la},0,${p4.x.toFixed(2)},${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// ── 子组件：单个房间 ──────────────────────────────────────

interface RoomArcProps {
  room: RoomDef;
  rOut: number;
  rInn: number;
  gap?: number;
  locked: boolean;
  rotating: boolean;
}

function RoomArc({ room, rOut, rInn, gap = 1, locked, rotating }: RoomArcProps) {
  const s = room.initialAngle - room.halfWidth + gap;
  const e = room.initialAngle + room.halfWidth - gap;
  const d = arcPath(rOut, rInn, s, e);
  const opacity = locked ? 0.18 : rotating ? 0.45 : 0.82;
  return (
    <g>
      <path d={d} fill={room.color} opacity={opacity} />
      {locked && !rotating && (
        <path d={d} fill="url(#lockPattern)" opacity={0.35} />
      )}
    </g>
  );
}

// ── 主组件 ────────────────────────────────────────────────

interface Props {
  timeMinutes: number;
}

export default function CircularMaze({ timeMinutes }: Props) {
  const t = timeMinutes;
  const s1 = useMemo(() => getRingState(t, 1), [t]);
  const s2 = useMemo(() => getRingState(t, 2), [t]);
  const s3 = useMemo(() => getRingState(t, 3), [t]);
  const s4 = useMemo(() => getRingState(t, 4), [t]);
  const isNight = useMemo(() => isNightTime(t), [t]);
  const connections = useMemo(() => getConnections(s1, s2, s3, s4, isNight), [s1, s2, s3, s4, isNight]);

  // 栅栏：固定在全局90°位置，夜间关闭
  const fenceOpen = !isNight;

  // 各圈旋转角（SVG rotate正值=顺时针）
  const rot = (s: RingState) => s.angle;

  // 计算房间当前全局角（用于显示文字标签）
  function globalAngle(room: RoomDef, ringAngle: number) {
    return normAngle(room.initialAngle + ringAngle);
  }

  // 标签位置
  function labelPos(r: number, deg: number) {
    return pXY(r, deg);
  }

  return (
    <svg
      viewBox="0 0 580 580"
      className="w-full max-w-[580px] select-none"
      style={{ filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.15))' }}
    >
      <defs>
        {/* 锁定斜线图案 */}
        <pattern id="lockPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.6)" strokeWidth="3" />
        </pattern>
        {/* 绿色发光滤镜（连通路径） */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* 红色发光（锁定连通） */}
        <filter id="redGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* 旋转光晕 */}
        <filter id="rotGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── 背景 ── */}
      <circle cx={CX} cy={CY} r={285} fill="#f8fafc" />
      <circle cx={CX} cy={CY} r={285} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />

      {/* ── 夜间蓝色氛围 ── */}
      {isNight && (
        <circle cx={CX} cy={CY} r={285}
          style={{ fill: 'rgba(99,102,241,0.06)' }}
        />
      )}

      {/* ── 圈1（顺时针旋转） ── */}
      <g transform={`rotate(${rot(s1)}, ${CX}, ${CY})`}>
        {RING1.map(room => (
          <RoomArc
            key={room.id}
            room={room}
            rOut={RADII.R1.out} rInn={RADII.R1.inn}
            locked={isRoomLocked(room, isNight, s1.isRotating)}
            rotating={s1.isRotating}
          />
        ))}
      </g>
      {/* 圈1旋转指示器 */}
      {s1.isRotating && (
        <circle cx={CX} cy={CY} r={RADII.R1.out - 2}
          fill="none" stroke="#F59E0B" strokeWidth={2}
          strokeDasharray="8,6" opacity={0.6} filter="url(#rotGlow)"
          style={{ animation: 'none' }}
        />
      )}

      {/* ── 圈2（逆时针旋转） ── */}
      <g transform={`rotate(${rot(s2)}, ${CX}, ${CY})`}>
        {RING2.map(room => (
          <RoomArc
            key={room.id}
            room={room}
            rOut={RADII.R2.out} rInn={RADII.R2.inn}
            locked={isRoomLocked(room, isNight, s2.isRotating)}
            rotating={s2.isRotating}
          />
        ))}
      </g>
      {s2.isRotating && (
        <circle cx={CX} cy={CY} r={RADII.R2.out - 2}
          fill="none" stroke="#F59E0B" strokeWidth={2}
          strokeDasharray="6,4" opacity={0.5} filter="url(#rotGlow)"
        />
      )}

      {/* ── 圈3（顺时针旋转） ── */}
      <g transform={`rotate(${rot(s3)}, ${CX}, ${CY})`}>
        {RING3.map(room => (
          <RoomArc
            key={room.id}
            room={room}
            rOut={RADII.R3.out} rInn={RADII.R3.inn}
            locked={isRoomLocked(room, isNight, s3.isRotating)}
            rotating={s3.isRotating}
          />
        ))}
      </g>
      {s3.isRotating && (
        <circle cx={CX} cy={CY} r={RADII.R3.out - 2}
          fill="none" stroke="#F59E0B" strokeWidth={2}
          strokeDasharray="5,4" opacity={0.5} filter="url(#rotGlow)"
        />
      )}

      {/* ── 圈4（中心，逆时针旋转） ── */}
      <g transform={`rotate(${rot(s4)}, ${CX}, ${CY})`}>
        {/* 圆心填充 */}
        <circle cx={CX} cy={CY} r={RADII.R4.out}
          fill={RING4.color}
          opacity={isRoomLocked(RING4, isNight, s4.isRotating) ? 0.18 : 0.72}
        />
        {/* 祭祀台入口方向指示弧（初始240°） */}
        <path
          d={arcPath(RADII.R4.out, RADII.R4.out - 10, RING4.initialAngle - 18, RING4.initialAngle + 18)}
          fill="rgba(255,255,255,0.25)"
        />
        {/* 锁定图案 */}
        {isRoomLocked(RING4, isNight, s4.isRotating) && (
          <circle cx={CX} cy={CY} r={RADII.R4.out}
            fill="url(#lockPattern)" opacity={0.3}
          />
        )}
      </g>
      {s4.isRotating && (
        <circle cx={CX} cy={CY} r={RADII.R4.out - 2}
          fill="none" stroke="#F59E0B" strokeWidth={2}
          strokeDasharray="4,3" opacity={0.5}
        />
      )}

      {/* ── 圈边界线 ── */}
      {[RADII.R1.out, RADII.R2.out, RADII.R3.out, RADII.R4.out].map(r => (
        <circle key={r} cx={CX} cy={CY} r={r}
          fill="none" stroke="#94a3b8" strokeWidth={1}
        />
      ))}
      <circle cx={CX} cy={CY} r={RADII.R1.inn}
        fill="none" stroke="#cbd5e1" strokeWidth={0.5} opacity={0.6}
      />

      {/* ── 连通指示线（全局坐标，不随圈旋转） ── */}
      {connections.map((conn, i) => {
        const ang = conn.globalAngle;
        const r = conn.boundaryR;
        const p1 = pXY(r + 12, ang);
        const p2 = pXY(r - 12, ang);
        const color = conn.locked ? '#EF4444' : '#22C55E';
        const flt = conn.locked ? 'url(#redGlow)' : 'url(#glow)';
        return (
          <line key={i}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={color} strokeWidth={3} strokeLinecap="round"
            opacity={0.9} filter={flt}
          />
        );
      })}

      {/* ── 房间文字标签（全局坐标，始终朝上） ── */}
      {/* 圈1标签 */}
      {RING1.map(room => {
        const ga = globalAngle(room, s1.angle);
        const pos = labelPos(RADII.R1.mid, ga);
        const locked = isRoomLocked(room, isNight, s1.isRotating);
        return (
          <text key={room.id}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={18} fontWeight="800"
            fill={locked ? '#94a3b8' : '#0f172a'}
            fontFamily="'Fira Code', monospace"
          >
            {room.name}
          </text>
        );
      })}

      {/* 圈2标签 */}
      {RING2.map(room => {
        const ga = globalAngle(room, s2.angle);
        const pos = labelPos(RADII.R2.mid, ga);
        const locked = isRoomLocked(room, isNight, s2.isRotating);
        return (
          <text key={room.id}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="700"
            fill={locked ? '#cbd5e1' : '#0f172a'}
            fontFamily="'Fira Code', monospace"
          >
            {room.name}
          </text>
        );
      })}

      {/* 圈3标签 */}
      {RING3.map(room => {
        const ga = globalAngle(room, s3.angle);
        const pos = labelPos(RADII.R3.mid, ga);
        const locked = isRoomLocked(room, isNight, s3.isRotating);
        return (
          <text key={room.id}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={15} fontWeight="800"
            fill={locked ? '#cbd5e1' : '#0f172a'}
            fontFamily="'Fira Code', monospace"
          >
            {room.name}
          </text>
        );
      })}

      {/* 圈4中心标签 */}
      <text x={CX} y={CY - 9}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight="800"
        fill={isRoomLocked(RING4, isNight, s4.isRotating) ? '#c4b5fd' : '#f8fafc'}
        fontFamily="'Fira Code', monospace"
      >
        祭祀
      </text>
      <text x={CX} y={CY + 10}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight="800"
        fill={isRoomLocked(RING4, isNight, s4.isRotating) ? '#c4b5fd' : '#f8fafc'}
        fontFamily="'Fira Code', monospace"
      >
        台
      </text>

      {/* ── 栅栏（固定全局90°） ── */}
      {(() => {
        const fp1 = pXY(RADII.R1.out + 6, 90);
        const fp2 = pXY(RADII.R1.out - 6, 90);
        return (
          <g>
            {/* 栅栏线 */}
            <line
              x1={fp1.x} y1={fp1.y} x2={fp2.x} y2={fp2.y}
              stroke={fenceOpen ? '#22C55E' : '#EF4444'}
              strokeWidth={4} strokeLinecap="round"
              opacity={0.9} filter={fenceOpen ? 'url(#glow)' : 'url(#redGlow)'}
            />
            {/* 栅栏小圆标记 */}
            <circle
              cx={pXY(RADII.R1.out + 14, 90).x}
              cy={pXY(RADII.R1.out + 14, 90).y}
              r={5}
              fill={fenceOpen ? '#22C55E' : '#EF4444'}
              opacity={0.9}
            />
            <text
              x={pXY(RADII.R1.out + 14, 90).x}
              y={pXY(RADII.R1.out + 14, 90).y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fill="white" fontWeight="700"
            >
              {fenceOpen ? '开' : '闭'}
            </text>
          </g>
        );
      })()}

      {/* ── 12点方向标记 ── */}
      <line x1={CX} y1={CY - RADII.R1.out - 8} x2={CX} y2={CY - RADII.R1.out - 20}
        stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
      />
      <circle cx={CX} cy={CY - RADII.R1.out - 24} r={3} fill="#94a3b8" />
      <text x={CX} y={CY - RADII.R1.out - 34}
        textAnchor="middle" fontSize={9} fill="#94a3b8"
        fontFamily="'Fira Code', monospace"
      >
        0°
      </text>

      {/* ── 夜间遮罩（仅提示） ── */}
      {isNight && (
        <circle cx={CX} cy={CY} r={RADII.R1.out}
          fill="rgba(99,102,241,0.08)" stroke="none" pointerEvents="none"
        />
      )}
    </svg>
  );
}
