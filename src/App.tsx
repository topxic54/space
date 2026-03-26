import { useState, useEffect, useCallback } from 'react';
import CircularMaze from './components/CircularMaze';
import {
  getRingState, isNightTime, isRoomLocked, getConnections, buildPaths,
} from './utils/mazeLogic';
import { RING1, RING2, RING3, RING4 } from './utils/mazeData';

// 分钟数→时间字符串 HH:MM
function minToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// 时间字符串→分钟数
function timeToMin(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

// 圈名称与旋转方向标注
const RING_INFO = [
  { label: '第一圈', desc: '顺时针 · 90°/15min', rooms: '4房间' },
  { label: '第二圈', desc: '逆时针 · 30°/10min', rooms: '12房间' },
  { label: '第三圈', desc: '顺时针 · 30°/10min', rooms: '6房间' },
  { label: '第四圈', desc: '逆时针 · 30°/10min', rooms: '1房间' },
];

export default function App() {
  const [timeMinutes, setTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [playing, setPlaying] = useState(false);

  // 自动播放：每100ms前进1分钟
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTimeMinutes(t => (t + 1) % 1440);
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  // 重置为当前实际时间
  const resetToNow = useCallback(() => {
    const now = new Date();
    setTimeMinutes(now.getHours() * 60 + now.getMinutes());
  }, []);

  // 计算各圈状态
  const s1 = getRingState(timeMinutes, 1);
  const s2 = getRingState(timeMinutes, 2);
  const s3 = getRingState(timeMinutes, 3);
  const s4 = getRingState(timeMinutes, 4);
  const isNight = isNightTime(timeMinutes);
  const connections = getConnections(s1, s2, s3, s4, isNight);
  const paths = buildPaths(connections);
  const fenceOpen = !isNight;

  const states = [s1, s2, s3, s4];

  // 所有房间（用于可通行房间列表）
  const allRooms = [
    ...RING1.map(r => ({ ...r, state: s1 })),
    ...RING2.map(r => ({ ...r, state: s2 })),
    ...RING3.map(r => ({ ...r, state: s3 })),
    { ...RING4, state: s4 },
  ];
  const accessibleRooms = allRooms.filter(r => !isRoomLocked(r, isNight, r.state.isRotating));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9', color: '#0f172a', fontFamily: "'Fira Code', monospace" }}>

      {/* ── 顶部标题栏 ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, #6d28d9, #1d4ed8)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#c4b5fd" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3.5" stroke="#a78bfa" strokeWidth="1" />
              <circle cx="8" cy="8" r="1" fill="#f8fafc" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-widest" style={{ color: '#4f46e5' }}>CIRCULAR MAZE</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#4f46e5' }}>圆形迷宫</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            {isNight ? '🌙 夜间模式' : '☀️ 白天模式'}
          </span>
          <div className="text-xl font-bold tabular-nums" style={{ color: isNight ? '#4f46e5' : '#d97706' }}>
            {minToTime(timeMinutes)}
          </div>
        </div>
      </header>

      {/* ── 主内容 ── */}
      <main className="flex flex-1 flex-col lg:flex-row gap-0 overflow-hidden">

        {/* 左侧：时间控制 + 迷宫 */}
        <div className="flex flex-col items-center gap-4 p-5 flex-shrink-0">

          {/* 时间控制器 */}
          <div className="w-full max-w-[860px] rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-widest" style={{ color: '#94a3b8' }}>TIME CONTROL</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetToNow}
                  className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-all"
                  style={{ background: '#ede9fe', color: '#4f46e5', border: '1px solid #ddd6fe' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ddd6fe')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ede9fe')}
                >
                  当前时间
                </button>
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-all font-bold"
                  style={{
                    background: playing ? '#7c3aed' : '#ede9fe',
                    color: playing ? '#f8fafc' : '#6d28d9',
                    border: '1px solid #ddd6fe',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {playing ? '⏸ 暂停' : '▶ 播放'}
                </button>
              </div>
            </div>

            {/* 时间输入 */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="time"
                value={minToTime(timeMinutes)}
                onChange={e => { if (e.target.value) setTimeMinutes(timeToMin(e.target.value)); }}
                className="rounded-lg px-3 py-2 text-sm font-bold tabular-nums cursor-pointer"
                style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', outline: 'none' }}
              />
              <div className="flex-1 relative">
                <input
                  type="range" min={0} max={1439} value={timeMinutes}
                  onChange={e => setTimeMinutes(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: isNight ? '#6366f1' : '#d97706' }}
                />
                {/* 快速跳转按钮 */}
                <div className="flex justify-between mt-1">
                  {[0, 360, 420, 720, 1200, 1380].map(m => (
                    <button
                      key={m}
                      onClick={() => setTimeMinutes(m)}
                      className="text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all"
                      style={{
                        background: timeMinutes === m ? '#e2e8f0' : 'transparent',
                        color: '#64748b',
                      }}
                    >
                      {minToTime(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 迷宫SVG */}
          <div className="w-full max-w-[860px]">
            <CircularMaze timeMinutes={timeMinutes} />
          </div>

          {/* 图例（迷宫下方，横向排列） */}
          <div className="w-full max-w-[860px] rounded-xl px-5 py-3" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-xs font-semibold tracking-widest mr-2" style={{ color: '#94a3b8' }}>LEGEND</span>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                <div className="w-6 rounded" style={{ background: '#22c55e', height: '3px' }} />
                <span>连通通道（可通行）</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                <div className="w-6 rounded" style={{ background: '#ef4444', height: '3px' }} />
                <span>连通通道（锁闭）</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                <div className="w-6 border-t-[3px] border-dashed" style={{ borderColor: '#f59e0b' }} />
                <span>正在旋转</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                <div className="w-4 h-3 rounded-sm" style={{ background: '#e2e8f0', backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 1px, transparent 0, transparent 50%)', backgroundSize: '4px 4px' }} />
                <span>锁定房间</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：状态面板 */}
        <div className="w-[380px] flex-shrink-0 p-5 overflow-y-auto flex flex-col gap-4" style={{ borderLeft: '1px solid #e2e8f0' }}>

          {/* 日夜状态 */}
          <div className="rounded-xl p-4" style={{ background: isNight ? '#eef2ff' : '#ffffff', border: `1px solid ${isNight ? '#c7d2fe' : '#e2e8f0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="text-xs font-semibold tracking-widest mb-2" style={{ color: '#94a3b8' }}>STATUS</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: isNight ? '#6366f1' : '#f59e0b' }} />
              <span className="font-bold" style={{ color: isNight ? '#4f46e5' : '#b45309' }}>
                {isNight ? '夜间 20:00–07:00' : '白天 07:00–20:00'}
              </span>
            </div>
            {isNight && (
              <p className="text-xs mt-2" style={{ color: '#6366f1' }}>
                仅 春 · 秋 · 狮子 · G · 祭祀台 可通行
              </p>
            )}
            <div className="mt-2 text-xs flex items-center gap-2" style={{ color: '#94a3b8' }}>
              <span>栅栏（90°）：</span>
              <span style={{ color: fenceOpen ? '#16a34a' : '#dc2626' }}>
                {fenceOpen ? '开启' : '关闭'}
              </span>
            </div>
          </div>

          {/* 各圈状态 */}
          <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#94a3b8' }}>RING STATUS</div>
            <div className="flex flex-col gap-2">
              {states.map((s, i) => {
                const info = RING_INFO[i];
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold" style={{ color: '#334155' }}>{info.label}</span>
                      <span className="ml-2" style={{ color: '#94a3b8' }}>{info.desc}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: s.isRotating ? '#fff7ed' : '#f0fdf4',
                        color: s.isRotating ? '#ea580c' : '#16a34a',
                        border: `1px solid ${s.isRotating ? '#fed7aa' : '#bbf7d0'}`,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                      {s.isRotating ? '旋转中' : '已停止'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 连通路径 */}
          <div className="rounded-xl p-4 flex-1" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#94a3b8' }}>CONNECTIONS</div>
            {paths.length === 0 ? (
              <p className="text-xs" style={{ color: '#cbd5e1' }}>
                {s1.isRotating || s2.isRotating || s3.isRotating || s4.isRotating
                  ? '旋转中，所有通道锁闭'
                  : '当前无连通路径'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {paths.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: p.locked ? '#ef4444' : '#22c55e' }}
                    />
                    <div>
                      <span style={{ color: p.locked ? '#94a3b8' : '#1e293b' }}>{p.path}</span>
                      {p.locked && (
                        <span className="ml-2 text-[10px]" style={{ color: '#ef4444' }}>锁闭</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 可通行房间 */}
          <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#94a3b8' }}>ACCESSIBLE ROOMS</div>
            {accessibleRooms.length === 0 ? (
              <p className="text-xs" style={{ color: '#cbd5e1' }}>无可通行房间</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {accessibleRooms.map(r => (
                  <span key={r.id} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: r.color + '22', color: r.color, border: `1px solid ${r.color}55` }}
                  >
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
