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
  const words = ["TRUMP MENTION TRACKER","LIVE TV DATA","GOD BLESS AMERICA","FIRST AMENDMENT FOREVER","GDELT + INTERNET ARCHIVE","FREEDOM IS NOT FREE","★ ★ ★"];
  const all = [...words,...words,...words,...words];
  return (
    <div className="ticker">
      <span className="ticker-flag">🇺🇸</span>
      <div className="ticker-track">
        <div className="ticker-roll">
          {all.map((w,i)=><span key={i} className="tword">{w}<span className="tsep"> ★ </span></span>)}
        </div>
      </div>
      <span className="ticker-flag">🇺🇸</span>
    </div>
  );
}

export default function App() {
  const [timespan, setTimespan] = useState("7days");
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  const doFetch = useCallback(() => {
    setLoading(true);
    setFetchTrigger(t=>t+1);
    setLastFetch(new Date());
    setTimeout(()=>setLoading(false), 4000);
  }, []);

  useEffect(()=>{ doFetch(); }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Share+Tech+Mono&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Barlow Condensed',sans-serif;min-height:100vh;background:#f0f4ff;overflow-x:hidden;}
        .stars-field{position:fixed;inset:0;pointer-events:none;z-index:0;background:linear-gradient(160deg,#002868 0%,#003580 18%,#bf0a30 55%,#ffffff 75%,#f0f4ff 100%);}
        .star-pt{position:absolute;color:rgba(255,255,255,0.55);animation:starPop ease-in-out infinite;user-select:none;line-height:1;}
        @keyframes starPop{0%,100%{opacity:0.3;transform:scale(0.85);}50%{opacity:1;transform:scale(1.2);}}
        .stripes-overlay{position:fixed;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(180deg,rgba(191,10,48,0.10) 0px,rgba(191,10,48,0.10) 44px,rgba(255,255,255,0.06) 44px,rgba(255,255,255,0.06) 88px);}
        .page{position:relative;z-index:2;}
        .ticker{display:flex;align-items:center;background:#bf0a30;border-bottom:4px solid #002868;height:38px;overflow:hidden;}
        .ticker-flag{font-size:22px;padding:0 10px;flex-shrink:0;}
        .ticker-track{flex:1;overflow:hidden;}
        .ticker-roll{display:flex;white-space:nowrap;animation:roll 36s linear infinite;}
        .tword{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.18em;color:#fff;text-transform:uppercase;padding-left:24px;}
        .tsep{color:#ffdd44;}
        @keyframes roll{from{transform:translateX(0);}to{transform:translateX(-25%);}}
        .header{text-align:center;padding:52px 24px 36px;border-bottom:4px solid rgba(255,255,255,0.3);}
        .hdr-eagle{font-size:72px;display:block;margin-bottom:8px;animation:float 3s ease-in-out infinite;}
        @keyframes float{0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-10px) rotate(2deg);}}
        .hdr-eyebrow{font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:0.3em;color:#ffdd44;text-shadow:0 1px 4px rgba(0,0,0,0.5);text-transform:uppercase;margin-bottom:10px;}
        .hdr-line1{font-family:'Oswald',sans-serif;font-size:clamp(32px,6vw,72px);font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#fff;text-shadow:2px 2px 0 #002868,4px 4px 0 rgba(0,0,0,0.3);line-height:1;}
        .hdr-trump{font-family:'Oswald',sans-serif;font-size:clamp(72px,16vw,180px);font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#fff;text-shadow:0 0 30px rgba(255,255,255,0.9),0 0 80px rgba(255,200,50,0.5),3px 3px 0 #bf0a30,6px 6px 0 #8a0020,9px 9px 0 rgba(0,0,0,0.2);line-height:0.9;animation:trumpGlow 2.5s ease-in-out infinite;}
        @keyframes trumpGlow{0%,100%{text-shadow:0 0 30px rgba(255,255,255,0.9),0 0 80px rgba(255,200,50,0.5),3px 3px 0 #bf0a30,6px 6px 0 #8a0020;}50%{text-shadow:0 0 60px #fff,0 0 120px rgba(255,220,80,0.8),3px 3px 0 #bf0a30,6px 6px 0 #8a0020;}}
        .hdr-line2{font-family:'Oswald',sans-serif;font-size:clamp(26px,5vw,60px);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffdd44;text-shadow:2px 2px 0 #002868,0 0 20px rgba(255,220,80,0.6);line-height:1.1;}
        .hdr-stars{font-size:22px;letter-spacing:0.4em;color:#ffdd44;margin:14px 0 10px;text-shadow:0 0 10px rgba(255,220,80,0.7);}
        .hdr-sub{font-family:'Barlow Condensed',sans-serif;font-size:16px;color:rgba(255,255,255,0.75);letter-spacing:0.06em;line-height:1.6;text-shadow:1px 1px 3px rgba(0,0,0,0.5);max-width:540px;margin:0 auto;}
        .stripe-div{height:14px;background:repeating-linear-gradient(90deg,#bf0a30 0px,#bf0a30 60px,#fff 60px,#fff 120px,#002868 120px,#002868 180px);border-top:2px solid rgba(255,255,255,0.4);border-bottom:2px solid rgba(255,255,255,0.4);}
        .fbtn-zone{display:flex;flex-direction:column;align-items:center;padding:44px 24px 36px;background:rgba(255,255,255,0.08);border-bottom:4px solid rgba(255,255,255,0.2);position:relative;}
        .fbtn{font-family:'Oswald',sans-serif;font-size:clamp(24px,4.5vw,44px);font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#bf0a30 0%,#8a0020 45%,#002868 55%,#001540 100%);border:5px solid #ffdd44;padding:24px 60px;cursor:pointer;display:flex;align-items:center;gap:22px;box-shadow:0 0 0 3px rgba(191,10,48,0.5),0 0 50px rgba(255,220,80,0.35),0 10px 40px rgba(0,0,0,0.4),inset 0 2px 0 rgba(255,255,255,0.25);transition:all 0.12s ease;clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);}
        .fbtn:hover:not(.fbtn-loading){transform:translateY(-4px) scale(1.03);box-shadow:0 0 0 3px #ffdd44,0 0 80px rgba(255,220,80,0.6),0 16px 50px rgba(0,0,0,0.5);}
        .fbtn:active:not(.fbtn-loading){transform:translateY(2px) scale(0.97);}
        .fbtn-loading{opacity:0.75;cursor:not-allowed;animation:btnPulse 0.7s ease infinite;}
        @keyframes btnPulse{0%,100%{box-shadow:0 0 0 3px rgba(191,10,48,0.5),0 0 20px rgba(255,220,80,0.2);}50%{box-shadow:0 0 0 5px #ffdd44,0 0 70px rgba(255,220,80,0.7);}}
        .fbtn-flag{font-size:36px;}
        .fbtn-sub{margin-top:14px;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(255,255,255,0.4);text-transform:uppercase;text-align:center;}
        .fbtn-particle{position:absolute;top:50%;left:50%;font-size:22px;pointer-events:none;z-index:20;animation:pBoom 0.9s ease-out forwards;--a:0deg;--d:80px;}
        @keyframes pBoom{0%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(0);opacity:1;}100%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(-1 * var(--d)));opacity:0;}}
        .controls{display:flex;align-items:center;justify-content:center;gap:6px;padding:20px 24px;flex-wrap:wrap;background:rgba(0,0,0,0.15);border-bottom:2px solid rgba(255,255,255,0.15);}
        .ctrl-label{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.2em;color:rgba(255,255,255,0.5);margin-right:10px;text-transform:uppercase;}
        .ctrl-btn{font-family:'Oswald',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;border:2px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.55);padding:9px 22px;cursor:pointer;transition:all 0.15s;}
        .ctrl-btn:hover{border-color:#ffdd44;color:#ffdd44;background:rgba(255,221,68,0.1);}
        .ctrl-btn.active{background:#ffdd44;border-color:#ffdd44;color:#002868;}
        .last-fetch{text-align:center;padding:10px;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.35);background:rgba(0,0,0,0.1);}
        .last-fetch em{color:#ffdd44;font-style:normal;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:3px;background:rgba(0,40,100,0.4);padding:3px;}
        .card{background:rgba(255,255,255,0.92);transition:transform 0.18s ease,box-shadow 0.18s ease;overflow:hidden;}
        .card:hover{transform:translateY(-3px);box-shadow:0 0 0 2px var(--nc),0 8px 32px rgba(0,0,0,0.25);z-index:2;position:relative;}
        .card-top-bar{height:6px;background:linear-gradient(90deg,var(--nc),var(--nl));}
        .card-body{padding:18px 20px 16px;}
        .card-header-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .card-name{font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;letter-spacing:0.06em;color:var(--nc);}
        .trend-pill{font-family:'Share Tech Mono',monospace;font-size:11px;padding:3px 8px;font-weight:bold;border-radius:2px;}
        .tup{color:#007730;background:rgba(0,150,60,0.12);border:1px solid rgba(0,150,60,0.3);}
        .tdown{color:#bf0a30;background:rgba(191,10,48,0.1);border:1px solid rgba(191,10,48,0.3);}
        .card-loading{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 0;}
        .spin-eagle{font-size:30px;animation:eagleFlap 0.9s linear infinite;}
        @keyframes eagleFlap{0%{transform:scaleX(1);}50%{transform:scaleX(-1);}100%{transform:scaleX(1);}}
        .loading-label{font-family:'Share Tech Mono',monospace;font-size:10px;color:#aab;letter-spacing:0.2em;animation:flash 0.6s ease infinite;}
        @keyframes flash{0%,100%{opacity:1;}50%{opacity:0.3;}}
        .card-error{display:flex;flex-direction:column;align-items:center;gap:5px;padding:14px 0;text-align:center;}
        .error-label{font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:#bf0a30;letter-spacing:0.08em;line-height:1.3;text-transform:uppercase;}
        .error-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:#aab;letter-spacing:0.1em;text-transform:uppercase;}
        .card-stat-row{display:flex;align-items:baseline;gap:6px;margin-bottom:10px;}
        .big-num{font-family:'Oswald',sans-serif;font-size:52px;font-weight:700;line-height:1;}
        .pct-sign{font-size:26px;opacity:0.65;}
        .num-label{font-family:'Share Tech Mono',monospace;font-size:9px;color:#889;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;align-self:flex-end;}
        .card-peak-row{font-family:'Share Tech Mono',monospace;font-size:10px;color:#889;letter-spacing:0.12em;text-transform:uppercase;margin-top:8px;}
        .footer{text-align:center;padding:32px 24px 52px;background:rgba(0,0,0,0.2);border-top:4px solid rgba(255,255,255,0.2);}
        .footer-stars{font-size:22px;letter-spacing:0.5em;color:#ffdd44;margin-bottom:14px;text-shadow:0 0 12px rgba(255,220,80,0.7);}
        .footer-note{font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;line-height:2;text-transform:uppercase;}
        .footer-note a{color:rgba(255,221,68,0.6);text-decoration:underline;}
        @media(max-width:600px){.grid{grid-template-columns:1fr 1fr;}.fbtn{padding:18px 24px;clip-path:none;}.hdr-trump{font-size:clamp(60px,22vw,120px);}}
      `}</style>

      <StarsField/>
      <div className="stripes-overlay"/>
      <div className="page">
        <TickerBar/>
        <div className="header">
          <span className="hdr-eagle">🦅</span>
          <div className="hdr-eyebrow">★ THE UNITED STATES OF MEDIA TRACKING ★</div>
          <div className="hdr-line1">HOW MANY TIMES DID THEY SAY</div>
          <div className="hdr-trump">TRUMP</div>
          <div className="hdr-line2">ON TV THIS WEEK?</div>
          <div className="hdr-stars">★ ★ ★ ★ ★ ★ ★ ★ ★</div>
          <p className="hdr-sub">
            Live closed-caption data · 7 major US TV news networks<br/>
            % of 15-second broadcast clips containing "TRUMP"<br/>
            Powered by GDELT Project + Internet Archive
          </p>
        </div>
        <div className="stripe-div"/>
        <BigFreedomButton onClick={doFetch} loading={loading}/>
        <div className="controls">
          <span className="ctrl-label">Range:</span>
          {TIME_RANGES.map(r=>(
            <button key={r.value}
              className={`ctrl-btn ${timespan===r.value?"active":""}`}
              onClick={()=>setTimespan(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
        {lastFetch && (
          <div className="last-fetch">
            Last fetched: <em>{lastFetch.toLocaleTimeString("en-US")}</em>
            &nbsp;·&nbsp;{loading?"⏳ fetching...":"✅ ready"}
          </div>
        )}
        <div className="grid">
          {NETWORKS.map(n=>(
            <NetworkCard key={`${n.id}-${fetchTrigger}`}
              network={n} timespan={timespan} fetchTrigger={fetchTrigger}/>
          ))}
        </div>
        <div className="stripe-div"/>
        <div className="footer">
          <div className="footer-stars">★ ★ ★ ★ ★ ★ ★</div>
          <p className="footer-note">
            Data: <a href="https://gdeltproject.org" target="_blank" rel="noreferrer">GDELT Project</a> TV 2.0 API
            via <a href="https://archive.org/details/tv" target="_blank" rel="noreferrer">Internet Archive TV News</a><br/>
            Metric = % of 15-second closed-caption clips mentioning "trump" per network<br/>
            Not affiliated with any news organization · For research &amp; informational purposes only<br/>
            🇺🇸 Land of the Free · Home of the Data · God Bless America 🇺🇸
          </p>
        </div>
      </div>
    </>
  );
}
