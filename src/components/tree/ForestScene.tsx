"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/locale-context";
import type {
  ForestBranchData,
  ForestTreeData,
} from "@/lib/types/forest";

const TREE_SLOT_WIDTH = 200;
const SCENE_HEIGHT = 380;
const GROUND_Y = 308;
const MAX_LEAVES_PER_BRANCH = 10;
const MAX_TRUNK_LEAVES = 14;

const LEAF_COLORS = ["#4d7c0f", "#65a30d", "#84cc16", "#3f6212", "#588157"];

// 以資料 id 產生固定亂數，確保伺服器與瀏覽器畫出相同森林（避免 hydration 差異）。
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function quadraticPoint(
  t: number,
  p0: [number, number],
  c: [number, number],
  p1: [number, number],
): [number, number] {
  const inv = 1 - t;
  return [
    inv * inv * p0[0] + 2 * inv * t * c[0] + t * t * p1[0],
    inv * inv * p0[1] + 2 * inv * t * c[1] + t * t * p1[1],
  ];
}

export function ForestScene({ forest }: { forest: ForestTreeData[] }) {
  const { dictionary } = useLocale();
  const width = Math.max(720, forest.length * TREE_SLOT_WIDTH + 60);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-forest-100/80">
      <svg
        viewBox={`0 0 ${width} ${SCENE_HEIGHT}`}
        role="img"
        aria-label={dictionary.forest.sceneAria}
        className="block h-auto w-full"
        style={{ minWidth: width }}
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d7ecfb" />
            <stop offset="78%" stopColor="#eef9ee" />
            <stop offset="100%" stopColor="#e4f4dc" />
          </linearGradient>
          <linearGradient id="forest-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9dc978" />
            <stop offset="100%" stopColor="#79ab55" />
          </linearGradient>
        </defs>

        <rect width={width} height={SCENE_HEIGHT} fill="url(#forest-sky)" />
        <circle cx={width - 90} cy={58} r={30} fill="#fde68a" opacity={0.9} />
        <circle cx={width - 90} cy={58} r={44} fill="#fde68a" opacity={0.25} />

        {/* 遠山 */}
        <ellipse
          cx={width * 0.22}
          cy={GROUND_Y + 26}
          rx={width * 0.4}
          ry={64}
          fill="#c3dfae"
          opacity={0.7}
        />
        <ellipse
          cx={width * 0.78}
          cy={GROUND_Y + 30}
          rx={width * 0.45}
          ry={72}
          fill="#b5d69c"
          opacity={0.6}
        />

        {/* 草地 */}
        <rect
          y={GROUND_Y}
          width={width}
          height={SCENE_HEIGHT - GROUND_Y}
          fill="url(#forest-grass)"
        />
        <Meadow width={width} />

        {forest.map((tree, index) => (
          <TreeFigure
            key={tree.id}
            tree={tree}
            x={TREE_SLOT_WIDTH * index + TREE_SLOT_WIDTH / 2 + 30}
            selected={selectedTreeId === tree.id}
            onSelect={() =>
              setSelectedTreeId((current) =>
                current === tree.id ? null : tree.id,
              )
            }
          />
        ))}
      </svg>
    </div>
  );
}

function Meadow({ width }: { width: number }) {
  const random = createRandom(hashSeed(`meadow-${width}`));
  const tufts = Math.floor(width / 34);

  return (
    <g>
      {Array.from({ length: tufts }, (_, i) => {
        const x = 16 + i * 34 + random() * 20;
        const y = GROUND_Y + 14 + random() * (SCENE_HEIGHT - GROUND_Y - 26);
        const flower = random() < 0.22;
        return flower ? (
          <g key={i}>
            <circle cx={x} cy={y} r={2.6} fill="#fda4af" />
            <circle cx={x} cy={y} r={1.1} fill="#fef3c7" />
          </g>
        ) : (
          <path
            key={i}
            d={`M ${x} ${y} q 2 -7 4 0 M ${x + 3} ${y} q 2 -9 4 0`}
            stroke="#5f8f3e"
            strokeWidth={1.4}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function TreeFigure({
  tree,
  x,
  selected,
  onSelect,
}: {
  tree: ForestTreeData;
  x: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { dictionary } = useLocale();
  const branchCount = tree.branches.length;
  const trunkHeight = Math.min(125 + branchCount * 22, 235);
  const trunkTopY = GROUND_Y - trunkHeight;

  return (
    <g
      transform={`translate(${x} 0)`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${tree.title}${
        selected ? dictionary.forest.hideName : dictionary.forest.showName
      }`}
      className="cursor-pointer focus:outline-none"
    >
      {/* 點擊判定範圍：涵蓋整棵樹的透明區域 */}
      <rect
        x={-TREE_SLOT_WIDTH / 2 + 10}
        y={trunkTopY - 44}
        width={TREE_SLOT_WIDTH - 20}
        height={trunkHeight + 60}
        fill="transparent"
      />

      {/* 樹影 */}
      <ellipse
        cx={0}
        cy={GROUND_Y + 5}
        rx={34 + branchCount * 3}
        ry={7}
        fill="#4b6b33"
        opacity={0.22}
      />

      {/* 樹幹：底部寬、往上收窄 */}
      <path
        d={`M -8 ${GROUND_Y}
            C -6 ${GROUND_Y - trunkHeight * 0.4} -4 ${GROUND_Y - trunkHeight * 0.75} -2 ${trunkTopY}
            L 2 ${trunkTopY}
            C 4 ${GROUND_Y - trunkHeight * 0.75} 6 ${GROUND_Y - trunkHeight * 0.4} 8 ${GROUND_Y}
            Z`}
        fill="#8b5e3c"
      />
      <path
        d={`M -3 ${GROUND_Y} C -2 ${GROUND_Y - trunkHeight * 0.5} -1 ${GROUND_Y - trunkHeight * 0.8} 0 ${trunkTopY + 6}`}
        stroke="#6d4a2f"
        strokeWidth={1.2}
        fill="none"
        opacity={0.6}
      />

      {/* 樹枝＝子目標 */}
      {tree.branches.map((branch, index) => (
        <BranchFigure
          key={branch.id}
          branch={branch}
          index={index}
          total={branchCount}
          trunkHeight={trunkHeight}
        />
      ))}

      {/* 樹冠：連結整棵樹（未指定樹枝）的記錄葉子 */}
      <CanopyLeaves
        treeId={tree.id}
        leafCount={tree.trunkLeafCount}
        topY={trunkTopY}
      />

      {/* 點擊樹之後才顯示主目標名稱 */}
      {selected && <TreeNameLabel title={tree.title} trunkTopY={trunkTopY} />}
    </g>
  );
}

function TreeNameLabel({
  title,
  trunkTopY,
}: {
  title: string;
  trunkTopY: number;
}) {
  // 依字數估算泡泡寬度（中文字約 14px、含左右留白）
  const boxWidth = Math.min(Math.max(title.length * 14 + 28, 72), 240);
  const display =
    title.length > 15 ? `${title.slice(0, 14)}…` : title;
  // 高樹的泡泡可能超出畫面頂端，往下夾住
  const boxY = Math.max(trunkTopY - 76, 8);

  return (
    <g aria-hidden>
      <rect
        x={-boxWidth / 2}
        y={boxY}
        width={boxWidth}
        height={30}
        rx={15}
        fill="#2f4525"
        opacity={0.92}
      />
      <path
        d={`M -6 ${boxY + 30} L 0 ${boxY + 38} L 6 ${boxY + 30} Z`}
        fill="#2f4525"
        opacity={0.92}
      />
      <text
        x={0}
        y={boxY + 20}
        textAnchor="middle"
        fontSize={13.5}
        fill="#f6fbef"
        fontWeight={600}
      >
        {display}
      </text>
    </g>
  );
}

function BranchFigure({
  branch,
  index,
  total,
  trunkHeight,
}: {
  branch: ForestBranchData;
  index: number;
  total: number;
  trunkHeight: number;
}) {
  const { dictionary, t } = useLocale();
  // 每根樹枝用自己的 id 當亂數種子；共用序列會因 React 重複渲染
  // 造成伺服器與瀏覽器畫面不一致（hydration mismatch）。
  const random = createRandom(hashSeed(branch.id));
  // 低的樹枝長在樹幹下方、越晚新增越靠近樹頂，左右交錯。
  const heightRatio = 0.42 + (0.5 * (index + 1)) / (total + 1);
  const startY = GROUND_Y - trunkHeight * heightRatio;
  const side = index % 2 === 0 ? 1 : -1;
  const length = 48 + Math.min(branch.leafCount, 8) * 3 + random() * 14;

  const start: [number, number] = [side * 3, startY];
  const end: [number, number] = [side * length, startY - length * 0.55];
  const control: [number, number] = [side * length * 0.55, startY - length * 0.1];

  const leafTotal = branch.leafCount;
  const leavesDrawn = Math.min(leafTotal, MAX_LEAVES_PER_BRANCH);
  const fruits = branch.tasks.filter((task) => task.isCompleted);

  return (
    <g>
      <title>
        {t(dictionary.forest.branchTitle, {
          title: branch.title,
          leaves: leafTotal,
          fruits: fruits.length,
        })}
      </title>
      <path
        d={`M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`}
        stroke="#7c5836"
        strokeWidth={3.4}
        strokeLinecap="round"
        fill="none"
      />

      {/* 葉子＝連結到這根樹枝的記錄 */}
      {Array.from({ length: leavesDrawn }, (_, i) => {
        const t = 0.4 + 0.58 * (leavesDrawn === 1 ? 0.8 : i / (leavesDrawn - 1));
        const [px, py] = quadraticPoint(t, start, control, end);
        const jitterX = (random() - 0.5) * 14;
        const jitterY = -4 - random() * 14;
        const angle = random() * 360;
        const color = LEAF_COLORS[Math.floor(random() * LEAF_COLORS.length)];
        return (
          <ellipse
            key={i}
            cx={px + jitterX}
            cy={py + jitterY}
            rx={4}
            ry={7.5}
            fill={color}
            opacity={0.92}
            transform={`rotate(${angle} ${px + jitterX} ${py + jitterY})`}
          />
        );
      })}
      {leafTotal > MAX_LEAVES_PER_BRANCH && (
        <text
          x={end[0]}
          y={end[1] - 22}
          textAnchor="middle"
          fontSize={10}
          fill="#3f6212"
        >
          +{leafTotal - MAX_LEAVES_PER_BRANCH} 🍃
        </text>
      )}

      {/* 果實＝這根樹枝上已勾選完成的任務 */}
      {fruits.map((task, i) => {
        const t = 0.42 + 0.5 * (fruits.length === 1 ? 0.9 : i / (fruits.length - 1));
        const [px, py] = quadraticPoint(t, start, control, end);
        return (
          <g key={task.id}>
            <line
              x1={px}
              y1={py}
              x2={px}
              y2={py + 7}
              stroke="#7c5836"
              strokeWidth={1.2}
            />
            <circle cx={px} cy={py + 12} r={5.2} fill="#dc2626" />
            <circle cx={px - 1.7} cy={py + 10.3} r={1.5} fill="#fecaca" opacity={0.85} />
          </g>
        );
      })}
    </g>
  );
}

function CanopyLeaves({
  treeId,
  leafCount,
  topY,
}: {
  treeId: string;
  leafCount: number;
  topY: number;
}) {
  const { dictionary, t } = useLocale();
  const random = createRandom(hashSeed(`canopy-${treeId}`));
  const drawn = Math.min(leafCount, MAX_TRUNK_LEAVES);

  return (
    <g>
      {leafCount > 0 && (
        <title>
          {t(dictionary.forest.trunkLeaves, { count: leafCount })}
        </title>
      )}
      {Array.from({ length: drawn }, (_, i) => {
        const angle = (i / Math.max(drawn, 1)) * Math.PI * 2 + random();
        const radius = 8 + random() * 16;
        const cx = Math.cos(angle) * radius;
        const cy = topY - 6 + Math.sin(angle) * radius * 0.7;
        const rotation = random() * 360;
        const color = LEAF_COLORS[Math.floor(random() * LEAF_COLORS.length)];
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={4.4}
            ry={8}
            fill={color}
            opacity={0.92}
            transform={`rotate(${rotation} ${cx} ${cy})`}
          />
        );
      })}
      {leafCount > MAX_TRUNK_LEAVES && (
        <text
          x={0}
          y={topY - 22}
          textAnchor="middle"
          fontSize={10}
          fill="#3f6212"
        >
          +{leafCount - MAX_TRUNK_LEAVES} 🍃
        </text>
      )}
    </g>
  );
}
