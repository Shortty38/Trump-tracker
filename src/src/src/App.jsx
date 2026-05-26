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
    id: i, x: Math.random()*100, y: Math.random()*100,
    size: Math.random()*14+6, delay: Math.random()*4, dur: 2+Math.random()*3,
  }));
  return (
    <div className="stars-field" aria-hidden>
      {stars.map((s) => (
        <div key={s.id} className="star-pt" style={{
          left:`${s.x}%`, top:`${s.y}%`, fontSize:s.size,
          animationDelay:`${s.delay}s`, animationDuration:`${s.dur}s`,
        }}>★</div>
      ))}
    </div>
  );
}

function Sparkline({ data, color, width=150, height=52 }) {
  if (!data || data.length < 2) return <svg width={width} height={height} />;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals) || 1;
  const pts = data.map((d,i) => {
    const x = (i/(data.length-1))*width;
    const y = height-((d.value-min)/(max-min+0.001))*(height-8)-4;
    return [x,y];
  });
  const pathD = pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${width},${height} L0,${height} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width={width} height={height} style={{overflow:"visible",display:"block"}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gid})`}/>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4.5" fill={color}/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4.5" fill={color} opacity="0.4">
        <animate attributeName="r" values="4;14;4" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

function NetworkCard({ network, timespan, fetchTrigger }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true); setError(false); setData(null);
    fetch(buildProxyUrl(network.id, timespan))
      .then(r=>r.json())
      .then(json => {
        const series = json?.timeline?.[0]?.data || [];
        const vals = series.map(d=>d.value||0);
        const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
        const peak = Math.max(...vals,0);
        const trend = series.length>1 ? series[series.length-1].value-series[0].value : 0;
        setData({ series, avg:Math.round(avg*100)/100, peak:Math.round(peak*100)/100, trend });
        setLoading(false);
      })
      .catch(()=>{ setError(true); setLoading(false); });
  }, [network.id, timespan, fetchTrigger]);

  return (
    <div className="card" style={{"--nc":network.color,"--nl":network.light}}>
      <div className="card-top-bar"/>
      <div className="card-body">
        <div className="card-header-row">
          <span className="card-name">{network.label}</span>
          {!loading && !error && data && (
            <span className={`trend-pill ${data.trend>=0?"tup":"tdown"}`}>
              {data.trend>=0?"▲":"▼"} {Math.abs(Math.round(data.trend*100)/100)}%
            </span>
          )}
        </div>
        {loading && (
          <div className="card-loading">
            <span className="spin-eagle">🦅</span>
            <span className="loading-label">LOADING...</span>
          </div>
        )}
        {error && !loading && (
          <div className="card-error">
            <span style={{fontSize:28}}>📡</span>
            <span className="error-label">BLOCKED BY<br/>FAKE NEWS</span>
            <span className="error-sub">Deploy to see live data</span>
          </div>
        )}
        {data && !loading && (
          <>
            <div className="card-stat-row">
              <span className="big-num" style={{color:network.color}}>
                {data.avg}<span className="pct-sign">%</span>
              </span>
              <span className="num-label">avg % of clips</span>
            </div>
            <Sparkline data={data.series} color={network.color} width={170} height={52}/>
            <div className="card-peak-row">
              PEAK <span style={{color:network.color,fontWeight:700}}>{data.peak}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BigFreedomButton({ onClick, loading }) {
  const [burst, setBurst] = useState(false);
  const emojis = ["🌟","⭐","🦅","🇺🇸","💥","✨","🌟","⭐","🦅","💥","✨","🌟"];
  const go = () => {
    if (loading) return;
    setBurst(true); onClick();
    setTimeout(()=>setBurst(false), 900);
  };
  return (
    <div className="fbtn-zone">
      {burst && emojis.map((e,i)=>(
        <span key={i} className="fbtn-particle" style={{
          "--a":`${i*30}deg`,"--d":`${70+(i%3)*35}px`,
          animationDelay:`${i*0.025}s`,
        }}>{e}</span>
      ))}
      <button className={`fbtn ${loading?"fbtn-loading":""}`} onClick={go}>
        <span className="fbtn-flag">🇺🇸</span>
        <span className="fbtn-label">{loading?"FETCHING DATA...":"GET THE NUMBERS"}</span>
        <span className="fbtn-flag">🦅</span>
      </button>
      <div className="fbtn-sub">TAP TO PULL LIVE CLOSED-CAPTION DATA FROM ALL 7 NETWORKS</div>
    </div>
  );
}

function TickerBar() {
  const words = ["TRUMP MENTION TRACKER","LIVE TV DATA","GOD BLESS AMERICA","FIRST AMENDMENT
