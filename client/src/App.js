import { useEffect, useRef, useState } from 'react';
import Map from './components/Map';
import AppAvailability from './components/AppAvailability';
import { api, currentLocation, exportDirections, isNative } from './platform';
import { App as NativeApp } from '@capacitor/app';
import './App.css';
const CHENNAI = {
  name: 'Chennai, Tamil Nadu, India',
  lat: 13.0827,
  lon: 80.2707
};
const PONDY = {
  name: 'Puducherry, India',
  lat: 11.9416,
  lon: 79.8083
};
function Place({
  label,
  value,
  onChange,
  disabled
}) {
  const [query, setQuery] = useState(value?.name || ''),
    [places, setPlaces] = useState([]),
    [message, setMessage] = useState('');
  const serial = useRef(0);
  useEffect(() => {
    if (value) setQuery(value.name);
    setPlaces([]);
    serial.current++;
  }, [value]);
  async function search() {
    const id = ++serial.current;
    setMessage('Searching…');
    try {
      const data = await api('places?q=' + encodeURIComponent(query));
      if (id === serial.current) {
        setPlaces(data.places);
        setMessage(data.places.length ? 'Select a matching city' : 'No cities found. Try another spelling.');
      }
    } catch (e) {
      if (id === serial.current) setMessage(e.message);
    }
  }
  return <div className="place"><label>{label}<div className="input-row"><input disabled={disabled} value={query} maxLength={120} placeholder="Search a city" onChange={e => {
          setQuery(e.target.value);
          serial.current++;
          setPlaces([]);
          if (value) onChange(null);
        }} onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            search();
          }
        }} /><button type="button" disabled={disabled || query.trim().length < 2} onClick={search} aria-label={'Search ' + label}>⌕</button></div></label>{message && <small role="status">{message}</small>}{places.length > 0 && <div className="place-results">{places.map(p => <button type="button" key={p.lat + ',' + p.lon} onClick={() => {
        onChange(p);
        setMessage('');
      }}>{p.name}</button>)}</div>}</div>;
}
function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem('ecoroute-trips') || '[]');
    return Array.isArray(v) ? v.filter(t => t && t.start?.name && t.end?.name && ['petrol', 'diesel', 'electric'].includes(t.vehicle) && Number.isInteger(t.passengers)).slice(0, 12) : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [start, setStart] = useState(CHENNAI),
    [end, setEnd] = useState(PONDY),
    [vehicle, setVehicle] = useState('petrol'),
    [passengers, setPassengers] = useState(1);
  const [trip, setTrip] = useState(null),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(readSaved),
    [tab, setTab] = useState('planner'),
    [question, setQuestion] = useState('How can I make this trip greener?'),
    [language, setLanguage] = useState('English'),
    [answer, setAnswer] = useState(null),
    [thinking, setThinking] = useState(false),
    [ai, setAi] = useState(false);
  useEffect(() => {
    if (!isNative()) return;
    let handle, disposed = false;
    NativeApp.addListener('backButton', () => {
      if (tab !== 'planner') setTab('planner');
      else NativeApp.minimizeApp();
    }).then(listener => { if (disposed) listener.remove(); else handle = listener; });
    return () => { disposed = true; handle?.remove(); };
  }, [tab]);
  const route = trip?.routes[selected];
  useEffect(() => {
    api('health').then(d => setAi(d.ai)).catch(() => {});
  }, []);
  async function plan(e, preset) {
    e?.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    setAnswer(null);
    setTrip(null);
    try {
      const result = await api('plan', preset || {
        start,
        end,
        vehicle,
        passengers
      });
      setTrip(result);
      setSelected(result.ecoId);
      setTab('planner');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function locate() {
    setNotice('Waiting for location permission...');
    try {
      const position = await currentLocation();
      setStart({ name: 'My current location', lat: position.coords.latitude, lon: position.coords.longitude });
      setNotice('Current location selected.');
    } catch {
      setNotice('');
      setError('Location unavailable or denied. Search for your starting city instead.');
    }
  }
  function persist(items) {
    try {
      localStorage.setItem('ecoroute-trips', JSON.stringify(items));
      setSaved(items);
      return true;
    } catch {
      setError('Browser storage is unavailable. Your trip could not be saved.');
      return false;
    }
  }
  function save() {
    const item = {
      id: trip.id,
      start: trip.start,
      end: trip.end,
      vehicle: trip.vehicle,
      passengers: trip.passengers,
      km: route.km,
      co2: route.co2,
      date: trip.createdAt
    };
    if (persist([item, ...saved.filter(t => t.id !== trip.id)].slice(0, 12))) setNotice('Trip saved on this device.');
  }
  async function ask(e) {
    e.preventDefault();
    setThinking(true);
    setAnswer(null);
    try {
      setAnswer(await api('assistant', {
        tripId: trip.id,
        question,
        language
      }));
    } catch (e) {
      setAnswer({
        mode: 'error',
        answer: e.message
      });
    } finally {
      setThinking(false);
    }
  }
  async function download() {
    const text = `EcoRoute trip plan\n${trip.start.name} → ${trip.end.name}\n${route.km} km · ${route.minutes} min (no live traffic)\nEstimated CO2: ${route.co2} kg · Energy cost: INR ${route.cost}\n\n` + route.steps.map((s, i) => `${i + 1}. ${s.instruction} (${Math.round(s.distance)} m)`).join('\n');
    try { await exportDirections(text); }
    catch (error) { if (error.name !== 'AbortError') setNotice('Sharing was cancelled or unavailable. Your trip is still saved in the planner.'); }
  }
  return <div className="app-shell">
    <aside className="rail"><a href="#main" className="brand-mark" aria-label="EcoRoute home">e<span>↗</span></a><button className={tab === 'planner' ? 'rail-button active' : 'rail-button'} onClick={() => setTab('planner')} aria-label="Route planner">⌘</button><button className={tab === 'saved' ? 'rail-button active' : 'rail-button'} onClick={() => setTab('saved')} aria-label="Saved trips">♡</button><div className="rail-bottom">ER</div></aside>
    <div className="workspace"><header><a className="wordmark" href="#main">EcoRoute<span>AI</span></a><nav><button className={tab === 'planner' ? 'nav-active' : ''} onClick={() => setTab('planner')}>Route planner</button><button className={tab === 'saved' ? 'nav-active' : ''} onClick={() => setTab('saved')}>Saved trips <small>{saved.length}</small></button></nav><span className="status"><i /> Mindful miles. Smaller footprint.</span></header>
    <main id="main"><AppAvailability /><div className="page-heading"><div><div className="eyebrow">A BETTER WAY TO GET THERE</div><h1>Your journey. A little greener.</h1><p>Discover your route, understand its impact, and travel thoughtfully.</p></div><span className="pill">↗ Built for better journeys</span></div>
    {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}{notice && <div className="notice" role="status">{notice}</div>}
    {tab === 'saved' ? <section className="card saved"><div className="section-title"><h2>Your saved journeys</h2><span className="muted">Stored only on this device</span></div>{saved.length === 0 ? <div className="empty"><span>♡</span><h3>A journey worth keeping</h3><p>Plan a route and save it here for next time.</p><button className="primary" onClick={() => setTab('planner')}>Plan a journey →</button></div> : saved.map(t => <article className="saved-row" key={t.id}><div><h3>{t.start.name.split(',')[0]} → {t.end.name.split(',')[0]}</h3><p>{t.km} km · {t.co2} kg estimated CO₂ · {new Date(t.date).toLocaleDateString()}</p></div><button disabled={busy} onClick={() => {
              setStart(t.start);
              setEnd(t.end);
              setVehicle(t.vehicle);
              setPassengers(t.passengers);
              plan(null, t);
            }}>Plan again ↗</button><button aria-label={'Delete trip to ' + t.end.name} onClick={() => persist(saved.filter(s => s.id !== t.id))}>×</button></article>)}</section> : <>
    <div className="planner-grid"><section className="card controls"><div className="section-title"><h2>Plan your journey</h2><span className="mini-icon">↗</span></div><p className="muted">Good choices start with a great route.</p><form onSubmit={plan}><Place label="STARTING POINT" value={start} onChange={setStart} disabled={busy} /><div className="between"><button type="button" onClick={locate} disabled={busy}>◎ Use my location</button><button type="button" aria-label="Swap start and destination" disabled={busy} onClick={() => {
                    setStart(end);
                    setEnd(start);
                  }}>⇅ Swap</button></div><Place label="DESTINATION" value={end} onChange={setEnd} disabled={busy} /><label className="field-label">YOUR VEHICLE</label><div className="vehicle-options">{[['petrol', 'Petrol'], ['diesel', 'Diesel'], ['electric', 'Electric']].map(([v, label]) => <button type="button" key={v} aria-pressed={vehicle === v} className={vehicle === v ? 'chosen' : ''} onClick={() => setVehicle(v)} disabled={busy}>{v === 'electric' ? 'ϟ' : '▱'}<span>{label}</span></button>)}</div><label className="passengers">Travellers<select value={passengers} disabled={busy} onChange={e => setPassengers(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}</select></label><button className="primary plan-button" disabled={busy || !start || !end}>{busy ? 'Finding your way…' : 'Find greener routes'} <span>→</span></button></form><div className="tip"><span>♧</span><p><strong>Small choices. Real impact.</strong>Sharing a ride lowers the estimated footprint per traveller.</p></div></section>
    <section className="card map-card"><div className="map-heading"><div><span className="live-dot" /> YOUR ROUTE, IN PERSPECTIVE</div><span>OpenStreetMap</span></div><Map trip={trip} selected={selected} /><div className="map-caption"><span>━━ <b>Selected route</b> <span className="alternate-line">━━</span> Alternatives</span><span>{trip ? `${trip.routes.length} route${trip.routes.length > 1 ? 's' : ''} found` : 'Choose your next destination'}</span></div>{busy && <div className="map-loading" role="status">Calculating routes and checking weather…</div>}</section></div>
    {trip && <><div className="results-heading"><div><div className="eyebrow">MAKE AN INFORMED CHOICE</div><h2>{trip.start.name.split(',')[0]} <span className="muted">→</span> {trip.end.name.split(',')[0]}</h2></div><div className="actions"><button onClick={save}>♡ Save trip</button><button onClick={download}>↓ Export directions</button></div></div><div className="route-grid">{trip.routes.map(r => <button key={r.id} className={'card route-card ' + (r.id === selected ? 'selected' : '')} onClick={() => setSelected(r.id)} aria-pressed={r.id === selected}><div className="section-title"><h3>Route {r.id + 1}</h3><span className="route-badge">{r.id === trip.ecoId ? '♧ Lowest CO₂' : r.id === trip.fastestId ? '↗ Fastest' : 'Alternative'}</span></div><div className="route-time">{Math.floor(r.minutes / 60) > 0 && `${Math.floor(r.minutes / 60)}h `}{r.minutes % 60}m <small>{r.km} km</small></div><div className="route-facts"><span><b>{r.co2} kg</b>estimated CO₂</span><span><b>₹{r.cost}</b>energy estimate</span><span><b>{r.perPerson} kg</b>per traveller</span></div></button>)}</div><p className="estimate-note">Estimates only · Driving times exclude live traffic. Carbon and energy costs use illustrative per-km factors; EV emissions include an assumed electricity footprint. Alternatives depend on routing availability.</p></>}
    <div className="insights-grid"><section className="card assistant"><div className="section-title"><h2><span className="spark">✧</span> Your trip copilot</h2><span className="pill">{ai ? 'AI enabled' : 'Local insights'}</span></div><p className="muted">{ai ? 'Ask about your route in English or Tamil. Answers use your calculated trip data.' : 'Get a calculated trip summary. Personalised AI answers unlock when the server has an AI key and model.'}</p><form onSubmit={ask}><div className="input-row"><input aria-label="Ask trip copilot" maxLength={600} value={question} onChange={e => setQuestion(e.target.value)} disabled={!trip || thinking || busy} /><button className="primary" disabled={!trip || thinking || busy || !question.trim()} aria-label="Send question">{thinking ? '…' : '↑'}</button></div><div className="assistant-footer"><span>{trip ? 'Grounded in this journey’s data' : 'Plan a journey to get started'}</span><select aria-label="Assistant language" value={language} onChange={e => setLanguage(e.target.value)}><option>English</option><option>Tamil</option></select></div></form>{answer && <div className="answer" role="status"><small>{answer.mode === 'ai' ? 'AI TRIP ASSISTANT' : answer.mode === 'local' ? 'CALCULATED SUMMARY · NOT GENERATIVE AI' : 'ASSISTANT UNAVAILABLE'}</small><p>{answer.answer}</p></div>}</section><section className="card weather"><div className="section-title"><h2>At your destination</h2><span>☀</span></div>{trip?.weather ? <><div className="temperature">{Math.round(trip.weather.temperature_2m)}<span>°C</span></div><p>{trip.end.name.split(',')[0]} · Current conditions</p><div className="weather-details"><span>Humidity <b>{trip.weather.relative_humidity_2m}%</b></span><span>Wind <b>{trip.weather.wind_speed_10m} km/h</b></span><span>Rain <b>{trip.weather.precipitation} mm</b></span></div><small>Open-Meteo · {trip.weather.time.replace('T', ' ')} local time</small></> : <div className="weather-empty"><span>☁</span><p>{trip ? 'Weather is temporarily unavailable.' : 'A little foresight for the road ahead.'}</p><small>{trip ? 'Your route is still ready.' : 'Destination weather appears after planning.'}</small></div>}</section></div>
    {route && <section className="card directions"><details><summary>Turn-by-turn directions <span>{route.steps.length} steps · Route {selected + 1}</span></summary><ol>{route.steps.map((s, i) => <li key={i}><span>{s.instruction}</span><small>{s.distance >= 1000 ? (s.distance / 1000).toFixed(1) + ' km' : Math.round(s.distance) + ' m'}</small></li>)}</ol></details></section>}
    </>}<footer><span>EcoRoute AI <span className="muted">/ Every journey is a choice.</span></span><span>Maps © OpenStreetMap · Routes by OSRM · Weather by Open-Meteo</span></footer></main><nav className="mobile-nav" aria-label="Mobile navigation"><button className={tab === 'planner' ? 'active' : ''} onClick={() => { setTab('planner'); window.scrollTo(0, 0); }} aria-label="Open route planner">Plan a route</button><button className={tab === 'saved' ? 'active' : ''} onClick={() => { setTab('saved'); window.scrollTo(0, 0); }} aria-label="Open saved journeys">Saved journeys ({saved.length})</button></nav></div></div>;
}
