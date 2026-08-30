import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadData, saveData } from "./supabaseClient";
import {
  Plus,
  Trash2,
  Users,
  Receipt,
  ChevronDown,
  Check,
  Wallet,
  ScrollText,
  ListChecks,
  UserRound,
  ShieldAlert,
} from "lucide-react";

const COLORS = {
  bg: "#0b1f14",
  panel: "#16311f",
  panelBorder: "#3d6a4c",
  chip: "#1f4128",
  chipBorder: "#4a7d5a",
  textMain: "#ffffff",
  textSoft: "#c9e3cf",
  textFaint: "#7fa389",
  gold: "#f0c33f",
  goldDark: "#0b1f14",
  entryBg: "#0f2818",
  danger: "#e0574f",
};

/* Barème officiel FC Crissier — saison 2026-2027 */
const DEFAULT_FINE_TYPES = [
  { id: "retard-entrainement", label: "Retard entraînement (après 18h45)", amount: 10, scope: "individual" },
  { id: "absence-entrainement", label: "Absence injustifiée — entraînement", amount: 20, scope: "individual" },
  { id: "absence-match", label: "Absence injustifiée — match", amount: 50, scope: "individual" },
  { id: "retard-match", label: "Retard match (moins de 1h45 avant)", amount: 25, scope: "individual" },
  { id: "oubli-equip-match", label: "Équipements oubliés — jour de match", amount: 20, scope: "individual" },
  { id: "oubli-equip-entrainement", label: "Oubli/mauvais équipement — entraînement", amount: 5, scope: "individual" },
  { id: "perte-materiel", label: "Perte de matériel (ballon, gourde cassée)", amount: 5, scope: "individual" },
  { id: "telephone-vestiaire", label: "Téléphone qui sonne au vestiaire", amount: 5, scope: "individual" },
  { id: "materiel-oublie-terrain", label: "Matériel du club oublié sur le terrain", amount: 5, scope: "individual" },
  { id: "materiel-perso-oublie", label: "Matériel personnel oublié sur le terrain", amount: 5, scope: "individual" },
  { id: "carton-jaune", label: "Carton jaune (pour la gueule)", amount: 30, scope: "individual" },
  { id: "carton-rouge", label: "Carton rouge (pour la gueule)", amount: 50, scope: "individual" },
  { id: "puff-vestiaire", label: "Puff au vestiaire — jour de match", amount: 25, scope: "individual" },
  { id: "snuz-douche", label: "Snuz qui traîne (douches / par terre)", amount: 5, scope: "individual" },
  { id: "snuz-terrain", label: "Snuz visible sur le terrain", amount: 10, scope: "individual" },
  { id: "clean-sheet-victoire", label: "Clean sheet + victoire (coach/s)", amount: 50, scope: "individual" },
  { id: "defaite-3buts", label: "Défaite par 3 buts d'écart ou plus (tout l'effectif)", amount: 10, scope: "individual" },
  { id: "perte-semaine", label: "Perdre toute la semaine (match + entraînement)", amount: 5, scope: "individual" },
  { id: "materiel-non-ramasse", label: "Matériel non ramassé après une défaite", amount: 5, scope: "team" },
  { id: "vestiaire-sale", label: "Vestiaire sale (Red Bull, bière, apéro, snuz, tape)", amount: 5, scope: "team" },
];

const CHARTE_TEXT = {
  intro: [
    "La présente charte a pour objectif de définir les règles disciplinaires applicables aux joueurs et aux membres du staff du FC Crissier pour la saison 2026–2027.",
    "Chaque joueur et membre du staff reconnaît, par la signature de ce document, avoir pris connaissance de l'ensemble des sanctions possibles en cas de non-respect des règles du club. Les motifs des sanctions sont clairement définis et doivent être respectés en tout temps.",
  ],
  engagements: [
    "Avoir lu et compris les règles disciplinaires",
    "Accepter sans réserve les sanctions associées aux infractions",
    "S'engager à respecter les valeurs et le fonctionnement du club",
  ],
  approbation:
    "Les sanctions mentionnées dans ce document ont été vues, discutées et approuvées par l'ensemble des joueurs, le staff ainsi que le président du club.",
  paiement: [
    "Le dernier vendredi de chaque mois",
    "Lors de l'entraînement",
  ],
  nonPaiement:
    "En cas de non-paiement dans les délais impartis, le président du club se réserve le droit de déduire automatiquement le montant dû des primes de fin de saison.",
  validite: "Cette charte est applicable pour toute la durée de la saison 2026–2027.",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shortMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString("fr-CH", { month: "short" });
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(".", "");
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const s = dt.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentYear() {
  return new Date().getFullYear();
}

function monthsForYear(year) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/* Bouton "supprimer" avec confirmation en ligne (pas de popup superposée) */
function DeleteButton({ onConfirm, size = 15 }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearTimeout(timerRef.current);
            setConfirming(false);
            onConfirm();
          }}
          style={{ background: COLORS.danger, border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 8px", cursor: "pointer" }}
        >
          Confirmer
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearTimeout(timerRef.current);
            setConfirming(false);
          }}
          style={{ background: "transparent", border: `1px solid ${COLORS.panelBorder}`, borderRadius: 6, color: COLORS.textSoft, fontSize: 11, fontWeight: 600, padding: "4px 8px", cursor: "pointer" }}
        >
          Annuler
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setConfirming(true);
        timerRef.current = setTimeout(() => setConfirming(false), 4000);
      }}
      style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", display: "flex" }}
      aria-label="Supprimer"
    >
      <Trash2 size={size} />
    </button>
  );
}

const TABS = [
  { id: "suivi", label: "Suivi", icon: Wallet },
  { id: "bareme", label: "Barème", icon: ListChecks },
  { id: "charte", label: "Charte", icon: ScrollText },
  { id: "effectif", label: "Effectif", icon: UserRound },
];

export default function App() {
  const [players, setPlayers] = useState([]);
  const [fineTypes, setFineTypes] = useState(DEFAULT_FINE_TYPES);
  const [entries, setEntries] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(currentYear());
  const [expanded, setExpanded] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [newPlayer, setNewPlayer] = useState("");
  const [newFineLabel, setNewFineLabel] = useState("");
  const [newFineAmount, setNewFineAmount] = useState("");
  const [newFineScope, setNewFineScope] = useState("individual");
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("suivi");
  // { targetId (playerId ou "__team__"), fineTypeId, date }
  const [pendingFine, setPendingFine] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadData();
        if (data) {
          if (data.players) setPlayers(data.players);
          if (data.fineTypes) setFineTypes(data.fineTypes);
          if (data.entries) setEntries(data.entries);
        }
      } catch (e) {
        console.error("Erreur de chargement Supabase", e);
        setStorageOk(false);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try {
      await saveData(next);
      setStorageOk(true);
    } catch (e) {
      console.error("Erreur de sauvegarde Supabase", e);
      setStorageOk(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist({ players, fineTypes, entries });
  }, [players, fineTypes, entries, loaded, persist]);

  useEffect(() => {
    const currentMonthPart = month.split("-")[1];
    setMonth(`${year}-${currentMonthPart}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  function addPlayer() {
    const name = newPlayer.trim();
    if (!name) return;
    setPlayers((p) => [...p, { id: uid(), name }]);
    setNewPlayer("");
  }

  function deletePlayer(id) {
    setPlayers((p) => p.filter((pl) => pl.id !== id));
    setEntries((e) => e.filter((en) => en.playerId !== id));
  }

  function addFineType() {
    const label = newFineLabel.trim();
    const amount = parseFloat(newFineAmount);
    if (!label || isNaN(amount)) return;
    setFineTypes((f) => [...f, { id: uid(), label, amount, scope: newFineScope }]);
    setNewFineLabel("");
    setNewFineAmount("");
    setNewFineScope("individual");
  }

  function deleteFineType(id) {
    setFineTypes((f) => f.filter((ft) => ft.id !== id));
  }

  function updateFineAmount(id, amount) {
    setFineTypes((f) =>
      f.map((ft) => (ft.id === id ? { ...ft, amount: parseFloat(amount) || 0 } : ft))
    );
  }

  function openFineForm(targetId, fineTypeId) {
    setPendingFine({ targetId, fineTypeId, date: todayIso() });
  }

  function confirmAddEntry() {
    if (!pendingFine || !pendingFine.date) return;
    const ft = fineTypes.find((f) => f.id === pendingFine.fineTypeId);
    if (!ft) return;
    const entryMonth = pendingFine.date.slice(0, 7);
    const isTeam = pendingFine.targetId === "__team__";
    setEntries((e) => [
      ...e,
      {
        id: uid(),
        playerId: isTeam ? null : pendingFine.targetId,
        fineTypeId: pendingFine.fineTypeId,
        label: ft.label,
        amount: ft.amount,
        month: entryMonth,
        date: pendingFine.date,
        ts: Date.now(),
      },
    ]);
    if (entryMonth !== month) setMonth(entryMonth);
    const y = parseInt(entryMonth.split("-")[0], 10);
    if (y !== year) setYear(y);
    showToast(`${ft.label} — ${ft.amount}.-`);
    setPendingFine(null);
  }

  function deleteEntry(id) {
    setEntries((e) => e.filter((en) => en.id !== id));
  }

  function toggleExpanded(key) {
    setExpanded((ex) => ({ ...ex, [key]: !ex[key] }));
    setPendingFine(null);
  }

  const monthEntries = entries.filter((e) => e.month === month);
  const individualFineTypes = fineTypes.filter((f) => f.scope !== "team");
  const teamFineTypes = fineTypes.filter((f) => f.scope === "team");

  function playerTotal(playerId) {
    return monthEntries.filter((e) => e.playerId === playerId).reduce((sum, e) => sum + e.amount, 0);
  }
  function playerEntries(playerId) {
    return monthEntries.filter((e) => e.playerId === playerId);
  }
  const teamEntries = monthEntries.filter((e) => e.playerId === null);
  const teamTotal = teamEntries.reduce((sum, e) => sum + e.amount, 0);

  const grandTotalMonth = monthEntries.reduce((sum, e) => sum + e.amount, 0);
  const yearEntries = entries.filter((e) => e.month.startsWith(String(year)));
  const totalYear = yearEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalAllTime = entries.reduce((sum, e) => sum + e.amount, 0);

  const dataYears = Array.from(new Set(entries.map((e) => parseInt(e.month.split("-")[0], 10))));
  const availableYears = Array.from(new Set([currentYear(), currentYear() + 1, ...dataYears])).sort((a, b) => b - a);
  const monthsOfYear = monthsForYear(year);

  function monthTotal(m) {
    return entries.filter((e) => e.month === m).reduce((sum, e) => sum + e.amount, 0);
  }

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );

  const cardStyle = { background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 16 };
  const inputStyle = { background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: COLORS.textMain };
  const goldBtn = { background: COLORS.gold, color: COLORS.goldDark, borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };

  function FineForm({ targetId }) {
    const formOpenHere = pendingFine && pendingFine.targetId === targetId;
    if (!formOpenHere) return null;
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.entryBg, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}
      >
        <p style={{ fontSize: 13, color: COLORS.textSoft, margin: 0 }}>
          <strong style={{ color: COLORS.textMain }}>{fineTypes.find((f) => f.id === pendingFine.fineTypeId)?.label}</strong> — quelle date ?
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="date"
            value={pendingFine.date}
            onChange={(e) => setPendingFine((pf) => ({ ...pf, date: e.target.value }))}
            style={{ flex: 1, minWidth: 150, ...inputStyle, padding: "8px 10px", colorScheme: "dark" }}
          />
          <button
            onClick={confirmAddEntry}
            disabled={!pendingFine.date}
            style={{ ...goldBtn, padding: "8px 14px", fontSize: 13, gap: 6, cursor: pendingFine.date ? "pointer" : "not-allowed" }}
          >
            <Check size={14} /> Ajouter
          </button>
          <button
            onClick={() => setPendingFine(null)}
            style={{ background: "transparent", border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: "8px 12px", color: COLORS.textSoft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  function EntryRow({ en }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: COLORS.textMain, background: COLORS.entryBg, borderRadius: 8, padding: "8px 12px", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontWeight: 500 }}>{en.label}</span>
          {en.date && <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>{formatDate(en.date)}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ color: COLORS.gold, fontWeight: 700 }}>{en.amount.toFixed(2)}.-</span>
          <DeleteButton onConfirm={() => deleteEntry(en.id)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.textMain, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap');
        .display-font { font-family: 'Archivo Black', sans-serif; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
      `}</style>

      <header style={{ borderBottom: `1px solid ${COLORS.panelBorder}`, padding: "22px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
            <div>
              <p style={{ color: COLORS.gold, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
                Caisse des amendes
              </p>
              <h1 className="display-font" style={{ fontSize: 28, color: COLORS.textMain, lineHeight: 1 }}>FC CRISSIER</h1>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Receipt size={20} color={COLORS.goldDark} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 0 12px",
                    background: "none",
                    border: "none",
                    borderBottom: active ? `2px solid ${COLORS.gold}` : "2px solid transparent",
                    color: active ? COLORS.gold : COLORS.textFaint,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        {!storageOk && (
          <div style={{ background: "#3a2a12", border: "1px solid #7a5a20", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f2d98a" }}>
            Connexion à la base de données impossible — vérifie ta connexion internet ou la configuration Supabase. Les changements ne seront pas sauvegardés tant que ce message est affiché.
          </div>
        )}

        {/* ---------------- SUIVI ---------------- */}
        {tab === "suivi" && (
          <>
            <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: COLORS.chip, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Wallet size={19} color={COLORS.gold} />
              </div>
              <div style={{ display: "flex", flex: 1, justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.textFaint, margin: 0, fontWeight: 600 }}>Ce mois</p>
                  <p className="display-font" style={{ fontSize: 18, color: COLORS.textMain, margin: 0 }}>{grandTotalMonth.toFixed(2)}.-</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.textFaint, margin: 0, fontWeight: 600 }}>Année {year}</p>
                  <p className="display-font" style={{ fontSize: 18, color: COLORS.textMain, margin: 0 }}>{totalYear.toFixed(2)}.-</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.textFaint, margin: 0, fontWeight: 600 }}>Cagnotte totale</p>
                  <p className="display-font" style={{ fontSize: 18, color: COLORS.gold, margin: 0 }}>{totalAllTime.toFixed(2)}.-</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  style={{ appearance: "none", background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: "10px 36px 10px 16px", fontSize: 14, fontWeight: 600, color: COLORS.textMain }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y} style={{ background: COLORS.panel, color: COLORS.textMain }}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={16} color={COLORS.textSoft} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
              <p style={{ fontSize: 13, color: COLORS.textSoft, fontWeight: 600, margin: 0 }}>{monthLabel(month)}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {monthsOfYear.map((m) => {
                const active = m === month;
                const t = monthTotal(m);
                return (
                  <button
                    key={m}
                    onClick={() => setMonth(m)}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                      padding: "8px 0 7px",
                      border: active ? "none" : `1px solid ${COLORS.chipBorder}`,
                      background: active ? COLORS.gold : COLORS.panel,
                      color: active ? COLORS.goldDark : COLORS.textMain,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span>{shortMonthLabel(m)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? COLORS.goldDark : t > 0 ? COLORS.gold : COLORS.textFaint }}>
                      {t > 0 ? `${t.toFixed(0)}.-` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {players.length === 0 && (
              <div style={{ border: `1px dashed ${COLORS.panelBorder}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
                <Users size={28} color={COLORS.textSoft} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: COLORS.textSoft, marginBottom: 16 }}>Aucun joueur pour l'instant. Ajoute l'effectif pour commencer.</p>
                <button onClick={() => setTab("effectif")} style={goldBtn}>Ajouter des joueurs</button>
              </div>
            )}

            {/* Amendes collectives (équipe) */}
            {teamFineTypes.length > 0 && (
              <div style={cardStyle}>
                <div
                  onClick={() => toggleExpanded("__team__")}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ChevronDown size={18} color={COLORS.textSoft} style={{ transition: "transform 0.15s", transform: expanded["__team__"] ? "rotate(180deg)" : "rotate(0deg)" }} />
                    <ShieldAlert size={17} color={COLORS.gold} />
                    <h3 style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 17, margin: 0 }}>Amendes collectives</h3>
                    {teamEntries.length > 0 && (
                      <span style={{ fontSize: 11, color: COLORS.textSoft, background: COLORS.bg, borderRadius: 999, padding: "2px 8px" }}>{teamEntries.length}</span>
                    )}
                  </div>
                  <span className="display-font" style={{ fontSize: 19, color: teamTotal > 0 ? COLORS.gold : COLORS.textFaint }}>{teamTotal.toFixed(2)}.-</span>
                </div>

                {expanded["__team__"] && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {teamFineTypes.map((ft) => (
                        <button
                          key={ft.id}
                          onClick={(e) => { e.stopPropagation(); openFineForm("__team__", ft.id); }}
                          style={{ fontSize: 13, fontWeight: 600, background: COLORS.chip, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 999, padding: "7px 14px", color: COLORS.textMain, cursor: "pointer" }}
                        >
                          {ft.label} <span style={{ color: COLORS.gold }}>{ft.amount}.-</span>
                        </button>
                      ))}
                    </div>
                    <FineForm targetId="__team__" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: `1px solid ${COLORS.panelBorder}` }}>
                      {teamEntries.length === 0 ? (
                        <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>Aucune amende collective ce mois-ci.</p>
                      ) : (
                        teamEntries.map((en) => <EntryRow key={en.id} en={en} />)
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedPlayers.map((pl) => {
                const total = playerTotal(pl.id);
                const pEntries = playerEntries(pl.id);
                const isOpen = !!expanded[pl.id];
                return (
                  <div key={pl.id} style={cardStyle}>
                    <div
                      onClick={() => toggleExpanded(pl.id)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ChevronDown size={18} color={COLORS.textSoft} style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                        <h3 style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 17, margin: 0 }}>{pl.name}</h3>
                        {pEntries.length > 0 && (
                          <span style={{ fontSize: 11, color: COLORS.textSoft, background: COLORS.bg, borderRadius: 999, padding: "2px 8px" }}>{pEntries.length}</span>
                        )}
                      </div>
                      <span className="display-font" style={{ fontSize: 19, color: total > 0 ? COLORS.gold : COLORS.textFaint }}>{total.toFixed(2)}.-</span>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {individualFineTypes.map((ft) => (
                            <button
                              key={ft.id}
                              onClick={(e) => { e.stopPropagation(); openFineForm(pl.id, ft.id); }}
                              style={{ fontSize: 13, fontWeight: 600, background: COLORS.chip, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 999, padding: "7px 14px", color: COLORS.textMain, cursor: "pointer" }}
                            >
                              {ft.label} <span style={{ color: COLORS.gold }}>{ft.amount}.-</span>
                            </button>
                          ))}
                        </div>
                        <FineForm targetId={pl.id} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: `1px solid ${COLORS.panelBorder}` }}>
                          {pEntries.length === 0 ? (
                            <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>Aucune amende ce mois-ci.</p>
                          ) : (
                            pEntries.map((en) => <EntryRow key={en.id} en={en} />)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ---------------- BARÈME ---------------- */}
        {tab === "bareme" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 className="display-font" style={{ fontSize: 20, color: COLORS.textMain, marginBottom: 4 }}>Barème des sanctions</h2>
              <p style={{ fontSize: 13, color: COLORS.textFaint, margin: 0 }}>Montants ajustables — les modifications s'appliquent aux prochaines amendes.</p>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 12px" }}>Amendes individuelles</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {individualFineTypes.map((ft) => (
                  <div key={ft.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13.5, color: COLORS.textMain }}>{ft.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={ft.amount} onChange={(e) => updateFineAmount(ft.id, e.target.value)} style={{ ...inputStyle, width: 60, padding: "6px 8px", textAlign: "right" }} />
                      <span style={{ fontSize: 12, color: COLORS.gold }}>.-</span>
                    </div>
                    <DeleteButton onConfirm={() => deleteFineType(ft.id)} />
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 12px" }}>Amendes collectives (équipe)</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {teamFineTypes.map((ft) => (
                  <div key={ft.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13.5, color: COLORS.textMain }}>{ft.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={ft.amount} onChange={(e) => updateFineAmount(ft.id, e.target.value)} style={{ ...inputStyle, width: 60, padding: "6px 8px", textAlign: "right" }} />
                      <span style={{ fontSize: 12, color: COLORS.gold }}>.-</span>
                    </div>
                    <DeleteButton onConfirm={() => deleteFineType(ft.id)} />
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain, margin: "0 0 12px" }}>Ajouter un motif</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newFineLabel} onChange={(e) => setNewFineLabel(e.target.value)} placeholder="Nom du motif" style={inputStyle} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={newFineAmount} onChange={(e) => setNewFineAmount(e.target.value)} placeholder="Montant CHF" style={{ ...inputStyle, flex: 1 }} />
                  <select
                    value={newFineScope}
                    onChange={(e) => setNewFineScope(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="individual" style={{ background: COLORS.panel }}>Individuelle</option>
                    <option value="team" style={{ background: COLORS.panel }}>Collective (équipe)</option>
                  </select>
                </div>
                <button onClick={addFineType} style={{ ...goldBtn, gap: 8 }}>
                  <Plus size={16} /> Ajouter au barème
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- CHARTE ---------------- */}
        {tab === "charte" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p style={{ color: COLORS.gold, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>Saison 2026–2027</p>
              <h2 className="display-font" style={{ fontSize: 20, color: COLORS.textMain, marginTop: 6, marginBottom: 0 }}>Charte disciplinaire — FC Crissier</h2>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 10px" }}>Engagement et prise de conscience</h4>
              {CHARTE_TEXT.intro.map((p, i) => (
                <p key={i} style={{ fontSize: 13.5, color: COLORS.textSoft, lineHeight: 1.6, margin: i === 0 ? "0 0 10px" : 0 }}>{p}</p>
              ))}
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 10px" }}>En signant cette charte, chacun confirme :</h4>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {CHARTE_TEXT.engagements.map((e, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: COLORS.textSoft, lineHeight: 1.5 }}>{e}</li>
                ))}
              </ul>
              <p style={{ fontSize: 13, color: COLORS.textFaint, lineHeight: 1.6, marginTop: 12, marginBottom: 0, fontStyle: "italic" }}>{CHARTE_TEXT.approbation}</p>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 10px" }}>Modalités de paiement des sanctions</h4>
              <p style={{ fontSize: 13.5, color: COLORS.textSoft, margin: "0 0 8px" }}>Le paiement des sanctions financières s'effectue :</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {CHARTE_TEXT.paiement.map((p, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: COLORS.textSoft }}>{p}</li>
                ))}
              </ul>
              <p style={{ fontSize: 13, color: COLORS.textFaint, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>{CHARTE_TEXT.nonPaiement}</p>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 8px" }}>Validité</h4>
              <p style={{ fontSize: 13.5, color: COLORS.textSoft, margin: 0 }}>{CHARTE_TEXT.validite}</p>
            </div>
          </div>
        )}

        {/* ---------------- EFFECTIF ---------------- */}
        {tab === "effectif" && (
          <div style={cardStyle}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain, margin: "0 0 12px" }}>Effectif ({players.length})</h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                placeholder="Nom du joueur"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={addPlayer} style={{ ...goldBtn, padding: "10px 14px" }} aria-label="Ajouter joueur">
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {players.length === 0 && <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic" }}>Aucun joueur enregistré.</p>}
              {sortedPlayers.map((pl) => (
                <div key={pl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: COLORS.textMain, padding: "6px 0", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                  <span>{pl.name}</span>
                  <DeleteButton onConfirm={() => deletePlayer(pl.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: COLORS.textFaint, paddingTop: 8 }}>
          Toutes les données (joueurs, barème, amendes) sont enregistrées automatiquement.
        </p>
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: COLORS.gold, color: COLORS.goldDark, fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
