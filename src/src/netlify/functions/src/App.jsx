import { useState, useEffect, useCallback } from "react";

const NETWORKS = [
  { id: "CNN",     label: "CNN",      color: "#cc0000", light: "#ff4444" },
  { id: "FOXNEWS", label: "Fox News", color: "#002fa7", light: "#4477ff" },
  { id: "MSNBC",   label: "MSNBC",   color: "#cc3300", light: "#ff6644" },
  { id: "CSPAN",   label: "C-SPAN",  color: "#003580", light: "#2255cc" },
  { id: "ABC",     label: "ABC",     color: "#001f8a", light: "#3366ff" },
  { id: "NBC",     label: "NBC",     color: "#aa1111", light: "#ff3333" },
  { id: "CBS",     label: "CBS",     color: "#002b6e", light: "#1144bb" },
];

const TIME_RANGES = [
  { label: "7 DAYS",  value: "7days"  },
  { label: "30 DAYS", value: "30days" },
  { label: "90 DAYS", value: "90days" },
];

function buildProxyUrl(network, timespan) {
  return `/api/gdelt?network=${network}&timespan=${timespan}`;
}

function StarsField() {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 14 + 6,
    delay: Math.random() * 4,
    dur: 2 + Math.random() * 3,
  }));
  return (
    <div className="stars-field" aria-hidden>
      {stars.map((s) => (
        <div key={s.id} className="star-pt" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          fontSize: s.size,
          animationDelay: `${s.delay}s`,
          animationDuration: `${s.dur}s`,
        }}>★</div>
      ))}
    </div>
  );
}

function Sparkline({ data, color, width = 150, height = 52 }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals) || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / (max - min + 0.001)) * (height - 8) - 4;
    return [x, y];
  });
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${width},${height} L0,${height} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4.5" fill={color} />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4.5" fill={color} opacity="0.4">
        <animate attributeName="r"       values="4;14;4"     dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4"  dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function NetworkCard({ network, timespan, fetchTrigger }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true); setError(false); setData(null);
    fetch(buildProxyUrl(network.id, timespan))
      .then(r => r.json())
      .then(json => {
        const series
