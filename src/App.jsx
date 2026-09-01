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
  History,
  CircleCheck,
  CircleDollarSign,
  Lock,
  LockOpen,
  BarChart3,
  Printer,
  Bell,
  MessageCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const STORAGE_KEY = "fc-crissier-amendes-data-v3";

const COLORS = {
  bg: "#050914",
  panel: "#141f42",
  panelSoft: "#0b1330",
  panelBorder: "#2a3872",
  chip: "#1b2856",
  chipBorder: "#37478c",
  textMain: "#f8f9fd",
  textSoft: "#b1badd",
  textFaint: "#6a76a8",
  blue: "#3d5cc4",
  blueDeep: "#1c2e6e",
  red: "#e21b2c",
  redDeep: "#a4121f",
  white: "#f8f9fd",
  gold: "#f2b632",
  goldDark: "#22150a",
  entryBg: "#101a3a",
  danger: "#f2a640",
  success: "#33d391",
};

const CATEGORIES = ["Ponctualité & présence", "Équipement & matériel", "Discipline", "Résultats sportifs", "Collectif", "Autre"];

/* Barème officiel FC Crissier — saison 2026-2027 */
const DEFAULT_FINE_TYPES = [
  { id: "retard-entrainement", label: "Retard entraînement (après 18h45)", amount: 10, scope: "individual", category: "Ponctualité & présence" },
  { id: "absence-entrainement", label: "Absence injustifiée — entraînement", amount: 20, scope: "individual", category: "Ponctualité & présence" },
  { id: "absence-match", label: "Absence injustifiée — match", amount: 50, scope: "individual", category: "Ponctualité & présence" },
  { id: "retard-match", label: "Retard match (moins de 1h45 avant)", amount: 25, scope: "individual", category: "Ponctualité & présence" },
  { id: "oubli-equip-match", label: "Équipements oubliés — jour de match", amount: 20, scope: "individual", category: "Équipement & matériel" },
  { id: "oubli-equip-entrainement", label: "Oubli/mauvais équipement — entraînement", amount: 5, scope: "individual", category: "Équipement & matériel" },
  { id: "perte-materiel", label: "Perte de matériel (ballon, gourde cassée)", amount: 5, scope: "individual", category: "Équipement & matériel" },
  { id: "materiel-oublie-terrain", label: "Matériel du club oublié sur le terrain", amount: 5, scope: "individual", category: "Équipement & matériel" },
  { id: "materiel-perso-oublie", label: "Matériel personnel oublié sur le terrain", amount: 5, scope: "individual", category: "Équipement & matériel" },
  { id: "carton-jaune", label: "Carton jaune (pour la gueule)", amount: 30, scope: "individual", category: "Discipline" },
  { id: "carton-rouge", label: "Carton rouge (pour la gueule)", amount: 50, scope: "individual", category: "Discipline" },
  { id: "telephone-vestiaire", label: "Téléphone qui sonne au vestiaire", amount: 5, scope: "individual", category: "Discipline" },
  { id: "puff-vestiaire", label: "Puff au vestiaire — jour de match", amount: 25, scope: "individual", category: "Discipline" },
  { id: "snuz-douche", label: "Snuz qui traîne (douches / par terre)", amount: 5, scope: "individual", category: "Discipline" },
  { id: "snuz-terrain", label: "Snuz visible sur le terrain", amount: 10, scope: "individual", category: "Discipline" },
  { id: "clean-sheet-victoire", label: "Clean sheet + victoire (coach/s)", amount: 50, scope: "individual", category: "Résultats sportifs" },
  { id: "defaite-3buts", label: "Défaite par 3 buts d'écart ou plus (tout l'effectif)", amount: 10, scope: "individual", category: "Résultats sportifs" },
  { id: "perte-semaine", label: "Perdre toute la semaine (match + entraînement)", amount: 5, scope: "individual", category: "Résultats sportifs" },
  { id: "materiel-non-ramasse", label: "Matériel non ramassé après une défaite", amount: 5, scope: "team", category: "Collectif" },
  { id: "vestiaire-sale", label: "Vestiaire sale (Red Bull, bière, apéro, snuz, tape)", amount: 5, scope: "team", category: "Collectif" },
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

/* Certaines amendes sauvegardées avant l'ajout du champ "catégorie" n'en ont pas —
   on la retrouve via le barème par défaut (même id) plutôt que de les laisser dans "Autre". */
function withCategory(fineTypes) {
  return fineTypes.map((ft) => {
    if (ft.category) return ft;
    const def = DEFAULT_FINE_TYPES.find((d) => d.id === ft.id);
    return { ...ft, category: def ? def.category : "Autre" };
  });
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

function lastFridayOfMonth(year, monthIndex0) {
  const lastDay = new Date(year, monthIndex0 + 1, 0);
  const dow = lastDay.getDay(); // 0=dim ... 5=ven, 6=sam
  const diffToFriday = (dow - 5 + 7) % 7;
  const friday = new Date(year, monthIndex0 + 1, 0 - diffToFriday);
  friday.setHours(0, 0, 0, 0);
  return friday;
}

function groupFinesByCategory(list) {
  const map = {};
  list.forEach((ft) => {
    const cat = ft.category || "Autre";
    if (!map[cat]) map[cat] = [];
    map[cat].push(ft);
  });
  const ordered = [];
  CATEGORIES.forEach((c) => {
    if (map[c]) {
      ordered.push([c, map[c]]);
      delete map[c];
    }
  });
  Object.keys(map).forEach((c) => ordered.push([c, map[c]]));
  return ordered;
}

/* Ballon dessiné à la main (SVG) — pas de dépendance externe */
function SoccerBall({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} style={{ flexShrink: 0 }}>
      <circle cx="16" cy="16" r="14.5" fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.2" />
      <g fill="#1a1a1a">
        <polygon points="16,9 20,12 18.5,17 13.5,17 12,12" />
        <polygon points="16,9 12,12 8.5,10 10,5.5 16,4.5 22,5.5 23.5,10 20,12" fill="none" stroke="#1a1a1a" strokeWidth="1" />
      </g>
      <g fill="none" stroke="#1a1a1a" strokeWidth="1">
        <path d="M13.5,17 L9,21.5 L4.5,19.5" />
        <path d="M18.5,17 L23,21.5 L27.5,19.5" />
        <path d="M12,12 L8.5,10 L4.5,11.5" />
        <path d="M20,12 L23.5,10 L27.5,11.5" />
        <path d="M9,21.5 L10.5,27" />
        <path d="M23,21.5 L21.5,27" />
      </g>
    </svg>
  );
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
  { id: "graphique", label: "Graphique", icon: BarChart3 },
  { id: "historique", label: "Historique", icon: History },
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
  const [newFineCategory, setNewFineCategory] = useState(CATEGORIES[0]);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("suivi");
  const [closedMonths, setClosedMonths] = useState({});
  const [readOnly] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("vue") === "lecture";
    } catch (e) {
      return false;
    }
  });
  // { targetId (playerId ou "__team__"), fineTypeId, date }
  const [pendingFine, setPendingFine] = useState(null);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadData();
        if (data) {
          if (data.players) setPlayers(data.players);
          if (data.fineTypes) setFineTypes(withCategory(data.fineTypes));
          if (data.entries) setEntries(data.entries);
          if (data.closedMonths) setClosedMonths(data.closedMonths);
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
    persist({ players, fineTypes, entries, closedMonths });
  }, [players, fineTypes, entries, closedMonths, loaded, persist]);

  useEffect(() => {
    const currentMonthPart = month.split("-")[1];
    setMonth(`${year}-${currentMonthPart}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    if (readOnly && (tab === "bareme" || tab === "effectif")) setTab("suivi");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, tab]);

  const readOnlyUrl = (() => {
    try {
      return `${window.location.origin}${window.location.pathname}?vue=lecture`;
    } catch (e) {
      return "";
    }
  })();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  function copyWhatsAppRecap() {
    const rows = printRows.filter((r) => r.total > 0);
    const lines = [];
    lines.push(`📋 *Amendes FC Crissier — ${monthLabel(month)}*`);
    lines.push("");
    if (rows.length === 0 && teamTotal === 0) {
      lines.push("Aucune amende ce mois-ci ✅");
    } else {
      rows.forEach((r) => lines.push(`• ${r.name} : ${r.total.toFixed(2)}.-`));
      if (teamTotal > 0) lines.push(`• Équipe (collectif) : ${teamTotal.toFixed(2)}.-`);
    }
    lines.push("");
    lines.push(`💰 *Total : ${grandTotalMonth.toFixed(2)}.-*`);
    lines.push("");
    lines.push("💳 Paiement : dernier vendredi du mois, à l'entraînement.");
    const text = lines.join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Récapitulatif copié !"))
      .catch(() => showToast("Impossible de copier"));
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
    setFineTypes((f) => [...f, { id: uid(), label, amount, scope: newFineScope, category: newFineCategory }]);
    setNewFineLabel("");
    setNewFineAmount("");
    setNewFineScope("individual");
    setNewFineCategory(CATEGORIES[0]);
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
        paid: false,
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

  function togglePaid(id) {
    setEntries((es) => es.map((en) => (en.id === id ? { ...en, paid: !en.paid } : en)));
  }

  function toggleMonthClosed(m) {
    setClosedMonths((c) => ({ ...c, [m]: !c[m] }));
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

  function monthPaidTotal(m) {
    return entries.filter((e) => e.month === m && e.paid).reduce((sum, e) => sum + e.amount, 0);
  }

  function playerUnpaid(playerId) {
    return entries.filter((e) => e.playerId === playerId && !e.paid).reduce((sum, e) => sum + e.amount, 0);
  }

  const teamUnpaid = entries.filter((e) => e.playerId === null && !e.paid).reduce((sum, e) => sum + e.amount, 0);

  const unpaidByPlayer = players
    .map((pl) => ({ ...pl, unpaid: playerUnpaid(pl.id) }))
    .filter((pl) => pl.unpaid > 0)
    .sort((a, b) => b.unpaid - a.unpaid);

  const chartData = monthsOfYear.map((m) => ({ name: shortMonthLabel(m), total: monthTotal(m) }));

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );

  const categoryTotals = fineTypes
    .map((ft) => ({
      id: ft.id,
      label: ft.label,
      total: yearEntries.filter((e) => e.fineTypeId === ft.id).reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCategoryTotal = Math.max(1, ...categoryTotals.map((c) => c.total));

  const printRows = sortedPlayers.map((pl) => ({ name: pl.name, total: playerTotal(pl.id) }));

  function playerAllEntries(playerId) {
    return entries.filter((e) => e.playerId === playerId).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  function playerAllTotal(playerId) {
    return entries.filter((e) => e.playerId === playerId).reduce((sum, e) => sum + e.amount, 0);
  }

  function playerPaidTotal(playerId) {
    return entries.filter((e) => e.playerId === playerId && e.paid).reduce((sum, e) => sum + e.amount, 0);
  }

  const viewingPlayer = viewingPlayerId ? players.find((p) => p.id === viewingPlayerId) : null;

  const displayedPlayers = showUnpaidOnly ? sortedPlayers.filter((pl) => playerUnpaid(pl.id) > 0) : sortedPlayers;

  const visibleTabs = readOnly ? TABS.filter((t) => t.id !== "bareme" && t.id !== "effectif") : TABS;

  const paymentReminder = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const friday = lastFridayOfMonth(today.getFullYear(), today.getMonth());
    const diffDays = Math.round((friday - today) / 86400000);
    if (diffDays < 0 || diffDays > 5) return null;
    const label = friday.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" });
    return { diffDays, label: label.charAt(0).toUpperCase() + label.slice(1) };
  })();

  const historyMonths = Array.from(new Set(entries.map((e) => e.month)))
    .sort()
    .reverse()
    .map((m) => {
      const total = monthTotal(m);
      const paid = monthPaidTotal(m);
      return { m, total, paid, unpaid: total - paid, closed: !!closedMonths[m] };
    });

  const cardStyle = {
    background: `linear-gradient(165deg, ${COLORS.panel} 0%, ${COLORS.panelSoft} 100%)`,
    border: `1px solid ${COLORS.panelBorder}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
  };
  const inputStyle = { background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: COLORS.textMain };
  const goldBtn = {
    background: `linear-gradient(135deg, ${COLORS.red} 0%, ${COLORS.redDeep} 100%)`,
    color: "#ffffff",
    borderRadius: 999,
    padding: "10px 14px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    boxShadow: "0 4px 14px -2px rgba(226,27,44,0.45)",
  };

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
            className="press"
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ color: COLORS.gold, fontWeight: 700 }}>{en.amount.toFixed(2)}.-</span>
          {readOnly ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 999,
                padding: "3px 9px",
                background: en.paid ? "rgba(51, 211, 145, 0.15)" : "rgba(242, 182, 50, 0.16)",
                color: en.paid ? COLORS.success : COLORS.gold,
              }}
            >
              {en.paid ? <CircleCheck size={12} /> : <CircleDollarSign size={12} />}
              {en.paid ? "Payé" : "Impayé"}
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePaid(en.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 999,
                padding: "3px 9px",
                border: "none",
                cursor: "pointer",
                background: en.paid ? "rgba(51, 211, 145, 0.15)" : "rgba(242, 182, 50, 0.16)",
                color: en.paid ? COLORS.success : COLORS.gold,
              }}
            >
              {en.paid ? <CircleCheck size={12} /> : <CircleDollarSign size={12} />}
              {en.paid ? "Payé" : "Impayé"}
            </button>
          )}
          {!readOnly && <DeleteButton onConfirm={() => deleteEntry(en.id)} />}
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=swap');
          @keyframes pulseLogo { 0%, 100% { opacity: 0.5; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }
        `}</style>
        <img
          src="https://www.fccrissier.ch/images/LOGO_FC_CRISSIER_SITE_3-cm.png"
          alt="FC Crissier"
          style={{ width: 56, height: 56, objectFit: "contain", animation: "pulseLogo 1.3s ease-in-out infinite" }}
        />
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.textFaint, letterSpacing: "0.03em", margin: 0 }}>
          Chargement de la caisse…
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.textMain, fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        .display-font { font-family: 'Barlow Condensed', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
        .print-sheet { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-sheet { display: block !important; }
        }
        .press:active { transform: scale(0.96); }
        .press { transition: transform 0.1s ease; }
        .trim-rule {
          height: 3px;
          background: linear-gradient(90deg, ${COLORS.red} 0 33%, ${COLORS.white} 33% 66%, ${COLORS.blue} 66% 100%);
        }
        ::-webkit-scrollbar { width: 0px; height: 0px; }
        .pitch-stripes {
          background-image: repeating-linear-gradient(
            100deg,
            rgba(255,255,255,0.012) 0px,
            rgba(255,255,255,0.012) 60px,
            transparent 60px,
            transparent 120px
          );
        }
        @keyframes ballBounce {
          0% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-7px) rotate(90deg); }
          60% { transform: translateY(0) rotate(150deg); }
          80% { transform: translateY(-3px) rotate(190deg); }
          100% { transform: translateY(0) rotate(220deg); }
        }
        .ball-bounce { animation: ballBounce 0.6s ease-out; }
        @keyframes toastIn {
          from { transform: translate(-50%, 12px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .toast-in { animation: toastIn 0.25s ease-out forwards; }
        @keyframes confettiFall {
          0% { transform: translateY(-6px) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(46px) rotate(280deg); opacity: 0; }
        }
        .confetti-dot { animation: confettiFall 1.6s ease-in infinite; }
      `}</style>

      <div className="pitch-stripes" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('https://www.fccrissier.ch/images/LOGO_FC_CRISSIER_SITE_3-cm.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 35%",
          backgroundSize: "min(480px, 85%)",
          opacity: 0.08,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="no-print" style={{ position: "relative", zIndex: 1 }}>
      <header style={{ background: `linear-gradient(180deg, ${COLORS.panelSoft} 0%, ${COLORS.bg} 100%)` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "22px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: `linear-gradient(155deg, #ffffff 0%, #e7eaf5 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 6px 18px -4px rgba(0,0,0,0.5), 0 0 0 1px ${COLORS.red}22`,
                padding: 6,
              }}
            >
              <img
                src="https://www.fccrissier.ch/images/LOGO_FC_CRISSIER_SITE_3-cm.png"
                alt="FC Crissier"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="display-font" style={{ fontSize: 25, fontWeight: 700, color: COLORS.textMain, lineHeight: 1.1, margin: 0, letterSpacing: "0.015em" }}>
                FC CRISSIER
              </h1>
              <p style={{ fontSize: 12.5, color: COLORS.textFaint, margin: "3px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={12} color={COLORS.gold} />
                Caisse des amendes{readOnly ? " — consultation" : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="trim-rule" />
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 96px", display: "flex", flexDirection: "column", gap: 20 }}>
        {viewingPlayer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <button
              onClick={() => setViewingPlayerId(null)}
              className="press"
              style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, border: "none", background: "none", color: COLORS.textSoft, cursor: "pointer", padding: 0 }}
            >
              ← Retour
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLORS.chip, border: `1px solid ${COLORS.chipBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span className="display-font" style={{ fontSize: 17, color: COLORS.textSoft }}>{viewingPlayer.name.charAt(0).toUpperCase()}</span>
              </div>
              <h2 className="display-font" style={{ fontSize: 22, color: COLORS.textMain, margin: 0 }}>{viewingPlayer.name}</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "0 0 4px", fontWeight: 600 }}>Total saison</p>
                <p className="display-font" style={{ fontSize: 16, color: COLORS.textMain, margin: 0 }}>{playerAllTotal(viewingPlayer.id).toFixed(2)}.-</p>
              </div>
              <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "0 0 4px", fontWeight: 600 }}>Payé</p>
                <p className="display-font" style={{ fontSize: 16, color: COLORS.success, margin: 0 }}>{playerPaidTotal(viewingPlayer.id).toFixed(2)}.-</p>
              </div>
              <div style={{ ...cardStyle, padding: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: COLORS.textFaint, margin: "0 0 4px", fontWeight: 600 }}>Impayé</p>
                <p className="display-font" style={{ fontSize: 16, color: COLORS.red, margin: 0 }}>{playerUnpaid(viewingPlayer.id).toFixed(2)}.-</p>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain, margin: "0 0 12px" }}>Historique complet</h4>
              {playerAllEntries(viewingPlayer.id).length === 0 ? (
                <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>Aucune amende enregistrée pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {playerAllEntries(viewingPlayer.id).map((en) => (
                    <EntryRow key={en.id} en={en} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!viewingPlayer && (
          <>
        {!storageOk && (
          <div style={{ background: "#3a2a12", border: "1px solid #7a5a20", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f2d98a" }}>
            Connexion à la base de données impossible — vérifie ta connexion internet ou la configuration Supabase. Les changements ne seront pas sauvegardés tant que ce message est affiché.
          </div>
        )}

        {/* ---------------- SUIVI ---------------- */}
        {tab === "suivi" && (
          <>
            {paymentReminder && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(242, 182, 50, 0.10)", border: `1px solid ${COLORS.gold}`, borderRadius: 10, padding: "10px 14px" }}>
                <Bell size={16} color={COLORS.gold} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: COLORS.textMain, margin: 0 }}>
                  {paymentReminder.diffDays === 0 ? (
                    <><strong>Paiement aujourd'hui</strong> — dernier vendredi du mois, lors de l'entraînement.</>
                  ) : (
                    <><strong>Paiement dans {paymentReminder.diffDays} jour{paymentReminder.diffDays > 1 ? "s" : ""}</strong> — {paymentReminder.label}, lors de l'entraînement.</>
                  )}
                </p>
              </div>
            )}

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 18,
                padding: "22px 20px",
                background: `linear-gradient(135deg, ${COLORS.blueDeep} 0%, ${COLORS.panel} 60%)`,
                border: `1px solid ${COLORS.panelBorder}`,
              }}
            >
              {/* Lueurs "projecteurs de stade" */}
              <div style={{ position: "absolute", top: -50, left: -30, width: 160, height: 160, borderRadius: "50%", background: COLORS.red, opacity: 0.22, filter: "blur(42px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -60, right: 40, width: 180, height: 180, borderRadius: "50%", background: "#4f77e0", opacity: 0.18, filter: "blur(48px)", pointerEvents: "none" }} />
              {/* Rond central de terrain, en accent discret */}
              <div style={{ position: "absolute", left: -34, bottom: -34, width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.10)", pointerEvents: "none" }} />

              <img
                src="https://www.fccrissier.ch/images/LOGO_FC_CRISSIER_SITE_3-cm.png"
                alt=""
                style={{ position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)", width: 130, height: 130, objectFit: "contain", opacity: 0.14, pointerEvents: "none", zIndex: 1 }}
              />
              <div style={{ position: "relative", zIndex: 2 }}>
                <p style={{ fontSize: 12.5, color: COLORS.textSoft, margin: 0, fontWeight: 500 }}>{monthLabel(month)}</p>
                <p className="display-font" style={{ fontSize: 44, fontWeight: 700, color: COLORS.textMain, margin: "2px 0 14px", lineHeight: 1, textShadow: "0 0 24px rgba(225,30,38,0.35)" }}>
                  {grandTotalMonth.toFixed(2)}.-
                </p>
                <div style={{ display: "flex", gap: 22 }}>
                  <div>
                    <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: 0, fontWeight: 600 }}>Année {year}</p>
                    <p className="display-font" style={{ fontSize: 16, color: COLORS.textMain, margin: 0 }}>{totalYear.toFixed(2)}.-</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10.5, color: COLORS.textFaint, margin: 0, fontWeight: 600 }}>Cagnotte totale</p>
                    <p className="display-font" style={{ fontSize: 16, color: COLORS.red, margin: 0 }}>{totalAllTime.toFixed(2)}.-</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => window.print()}
                className="press"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 600, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 10, padding: "11px 4px", color: COLORS.textMain, background: COLORS.chip, cursor: "pointer" }}
              >
                <Printer size={14} color={COLORS.textSoft} /> Exporter en PDF
              </button>
              <button
                onClick={copyWhatsAppRecap}
                className="press"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 600, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 10, padding: "11px 4px", color: COLORS.textMain, background: COLORS.chip, cursor: "pointer" }}
              >
                <MessageCircle size={14} color={COLORS.success} /> Récap WhatsApp
              </button>
            </div>

            {(unpaidByPlayer.length > 0 || teamUnpaid > 0) && (
              <div style={cardStyle}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                  <CircleDollarSign size={15} color={COLORS.gold} /> Reste à payer
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {unpaidByPlayer.map((pl) => (
                    <div key={pl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ color: COLORS.textSoft }}>{pl.name}</span>
                      <span style={{ color: COLORS.gold, fontWeight: 700 }}>{pl.unpaid.toFixed(2)}.-</span>
                    </div>
                  ))}
                  {teamUnpaid > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ color: COLORS.textSoft }}>Équipe (collectif)</span>
                      <span style={{ color: COLORS.gold, fontWeight: 700 }}>{teamUnpaid.toFixed(2)}.-</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {monthEntries.length > 0 && unpaidByPlayer.length === 0 && teamUnpaid === 0 && (
              <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 10, background: "rgba(52, 211, 153, 0.10)", border: `1px solid ${COLORS.success}`, borderRadius: 10, padding: "10px 14px" }}>
                {[10, 28, 46, 64, 82].map((left, i) => (
                  <span
                    key={i}
                    className="confetti-dot"
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: 4,
                      width: 5,
                      height: 5,
                      borderRadius: i % 2 === 0 ? "50%" : 2,
                      background: i % 3 === 0 ? COLORS.red : i % 3 === 1 ? "#4f77e0" : COLORS.success,
                      animationDelay: `${i * 0.22}s`,
                    }}
                  />
                ))}
                <CircleCheck size={16} color={COLORS.success} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: COLORS.textMain, margin: 0 }}>
                  <strong>Tout est payé</strong> pour {monthLabel(month)} 🎉
                </p>
              </div>
            )}

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
                <p style={{ fontSize: 14, color: COLORS.textSoft, marginBottom: readOnly ? 0 : 16 }}>Aucun joueur pour l'instant.{!readOnly && " Ajoute l'effectif pour commencer."}</p>
                {!readOnly && <button onClick={() => setTab("effectif")} className="press" style={goldBtn}>Ajouter des joueurs</button>}
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
                    {!readOnly && (
                      <>
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
                      </>
                    )}
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

            {sortedPlayers.length > 0 && (
              <button
                onClick={() => setShowUnpaidOnly((s) => !s)}
                className="press"
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "6px 12px",
                  border: `1px solid ${showUnpaidOnly ? COLORS.gold : COLORS.panelBorder}`,
                  background: showUnpaidOnly ? "rgba(242,182,50,0.15)" : "transparent",
                  color: showUnpaidOnly ? COLORS.gold : COLORS.textSoft,
                  cursor: "pointer",
                }}
              >
                <CircleDollarSign size={13} /> Impayés uniquement
              </button>
            )}

            {showUnpaidOnly && displayedPlayers.length === 0 && sortedPlayers.length > 0 && (
              <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>
                Tout le monde est à jour ✅
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {displayedPlayers.map((pl) => {
                const total = playerTotal(pl.id);
                const pEntries = playerEntries(pl.id);
                const isOpen = !!expanded[pl.id];
                const hasUnpaid = playerUnpaid(pl.id) > 0;
                const accent = hasUnpaid ? COLORS.red : COLORS.success;
                return (
                  <div key={pl.id} style={{ ...cardStyle, position: "relative", overflow: "hidden", paddingLeft: 19 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: accent, boxShadow: `0 0 10px ${accent}88` }} />
                    <div
                      onClick={() => toggleExpanded(pl.id)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none", gap: 10 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: `linear-gradient(155deg, ${COLORS.chip} 0%, ${COLORS.panelSoft} 100%)`,
                            border: `1px solid ${COLORS.chipBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span className="display-font" style={{ fontSize: 14, color: COLORS.textSoft }}>{pl.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <h3 style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 15.5, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</h3>
                        {pEntries.length > 0 && (
                          <span style={{ fontSize: 11, color: COLORS.textSoft, background: COLORS.bg, borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>{pEntries.length}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span className="display-font" style={{ fontSize: 17, color: total > 0 ? COLORS.textMain : COLORS.textFaint }}>{total.toFixed(2)}.-</span>
                        <ChevronDown size={16} color={COLORS.textFaint} style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                        {!readOnly && (
                          <>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              {groupFinesByCategory(individualFineTypes).map(([cat, items]) => (
                                <div key={cat}>
                                  <p style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, margin: "0 0 6px", letterSpacing: "0.01em" }}>{cat}</p>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {items.map((ft) => (
                                      <button
                                        key={ft.id}
                                        onClick={(e) => { e.stopPropagation(); openFineForm(pl.id, ft.id); }}
                                        style={{ fontSize: 13, fontWeight: 600, background: COLORS.chip, border: `1px solid ${COLORS.chipBorder}`, borderRadius: 999, padding: "7px 14px", color: COLORS.textMain, cursor: "pointer" }}
                                      >
                                        {ft.label} <span style={{ color: COLORS.gold }}>{ft.amount}.-</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <FineForm targetId={pl.id} />
                          </>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: `1px solid ${COLORS.panelBorder}` }}>
                          {pEntries.length === 0 ? (
                            <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>Aucune amende ce mois-ci.</p>
                          ) : (
                            pEntries.map((en) => <EntryRow key={en.id} en={en} />)
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPlayerId(pl.id);
                          }}
                          className="press"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 600, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, padding: "9px 0", color: COLORS.textSoft, background: "transparent", cursor: "pointer" }}
                        >
                          Voir la fiche complète →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ---------------- BARÈME ---------------- */}
        {tab === "bareme" && !readOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 className="display-font" style={{ fontSize: 20, color: COLORS.textMain, marginBottom: 4 }}>Barème des sanctions</h2>
              <p style={{ fontSize: 13, color: COLORS.textFaint, margin: 0 }}>Montants ajustables — les modifications s'appliquent aux prochaines amendes.</p>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, margin: "0 0 14px" }}>Amendes individuelles</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {groupFinesByCategory(individualFineTypes).map(([cat, items]) => (
                  <div key={cat}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textFaint, margin: "0 0 8px" }}>{cat}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((ft) => (
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
                <select
                  value={newFineCategory}
                  onChange={(e) => setNewFineCategory(e.target.value)}
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ background: COLORS.panel }}>{c}</option>
                  ))}
                </select>
                <button onClick={addFineType} className="press" style={{ ...goldBtn, gap: 8 }}>
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

        {/* ---------------- GRAPHIQUE ---------------- */}
        {tab === "graphique" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 className="display-font" style={{ fontSize: 20, color: COLORS.textMain, marginBottom: 4 }}>Évolution mensuelle</h2>
                <p style={{ fontSize: 13, color: COLORS.textFaint, margin: 0 }}>Total des amendes par mois pour l'année sélectionnée.</p>
              </div>
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
            </div>

            <div style={cardStyle}>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.panelBorder} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: COLORS.textFaint, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: COLORS.entryBg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: COLORS.textMain }}
                      formatter={(v) => [`${v.toFixed(2)}.-`, "Total"]}
                    />
                    <Bar dataKey="total" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.panelBorder}` }}>
                <span style={{ color: COLORS.textSoft }}>Total {year}</span>
                <span className="display-font" style={{ color: COLORS.textMain, fontSize: 16 }}>{totalYear.toFixed(2)}.-</span>
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain, margin: "0 0 14px" }}>Répartition par catégorie — {year}</h4>
              {categoryTotals.length === 0 ? (
                <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic", margin: 0 }}>Aucune amende enregistrée pour {year}.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoryTotals.map((c) => (
                    <div key={c.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: COLORS.textSoft }}>{c.label}</span>
                        <span style={{ color: COLORS.gold, fontWeight: 700 }}>{c.total.toFixed(2)}.-</span>
                      </div>
                      <div style={{ width: "100%", height: 6, background: COLORS.chip, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${(c.total / maxCategoryTotal) * 100}%`, height: "100%", background: COLORS.gold, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- HISTORIQUE ---------------- */}
        {tab === "historique" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h2 className="display-font" style={{ fontSize: 20, color: COLORS.textMain, marginBottom: 4 }}>Historique des mois</h2>
              <p style={{ fontSize: 13, color: COLORS.textFaint, margin: 0 }}>Clôture un mois une fois le paiement collecté, pour garder une trace claire.</p>
            </div>

            {historyMonths.length === 0 && (
              <div style={{ border: `1px dashed ${COLORS.panelBorder}`, borderRadius: 12, padding: 32, textAlign: "center" }}>
                <History size={28} color={COLORS.textSoft} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: COLORS.textSoft, margin: 0 }}>Aucune amende enregistrée pour l'instant.</p>
              </div>
            )}

            {historyMonths.map(({ m, total, paid, unpaid, closed }) => (
              <div key={m} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textMain, margin: 0 }}>{monthLabel(m)}</h3>
                    {closed && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.success, background: "rgba(74, 222, 128, 0.15)", borderRadius: 999, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                        <Lock size={10} /> Clôturé
                      </span>
                    )}
                  </div>
                  <span className="display-font" style={{ fontSize: 17, color: COLORS.gold }}>{total.toFixed(2)}.-</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: COLORS.textSoft, marginBottom: closed || !readOnly ? 12 : 0 }}>
                  <span>Payé : <strong style={{ color: COLORS.success }}>{paid.toFixed(2)}.-</strong></span>
                  <span>Impayé : <strong style={{ color: COLORS.gold }}>{unpaid.toFixed(2)}.-</strong></span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => toggleMonthClosed(m)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: "100%",
                      fontSize: 12.5,
                      fontWeight: 600,
                      borderRadius: 8,
                      padding: "8px 0",
                      border: `1px solid ${COLORS.panelBorder}`,
                      background: "transparent",
                      color: COLORS.textSoft,
                      cursor: "pointer",
                    }}
                  >
                    {closed ? <LockOpen size={13} /> : <Lock size={13} />}
                    {closed ? "Rouvrir ce mois" : "Clôturer ce mois"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ---------------- EFFECTIF ---------------- */}
        {tab === "effectif" && !readOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                <button onClick={addPlayer} className="press" style={{ ...goldBtn, padding: "10px 14px" }} aria-label="Ajouter joueur">
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {players.length === 0 && <p style={{ fontSize: 13, color: COLORS.textFaint, fontStyle: "italic" }}>Aucun joueur enregistré.</p>}
                {sortedPlayers.map((pl) => (
                  <div key={pl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: COLORS.textMain, padding: "7px 4px", borderRadius: 8, gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.chip, border: `1px solid ${COLORS.chipBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="display-font" style={{ fontSize: 12, color: COLORS.textSoft }}>{pl.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                    </div>
                    <DeleteButton onConfirm={() => deletePlayer(pl.id)} />
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain, margin: "0 0 6px" }}>Partager avec les joueurs</h4>
              <p style={{ fontSize: 12.5, color: COLORS.textFaint, margin: "0 0 14px" }}>
                Ce lien affiche la caisse en lecture seule — les joueurs peuvent consulter leurs amendes sans rien modifier.
              </p>
              {readOnlyUrl && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ background: "#ffffff", padding: 10, borderRadius: 10 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(readOnlyUrl)}`}
                      alt="QR code — accès lecture seule"
                      width={200}
                      height={200}
                      style={{ display: "block" }}
                    />
                  </div>
                  <p style={{ fontSize: 11.5, color: COLORS.textFaint, textAlign: "center", wordBreak: "break-all", margin: 0 }}>{readOnlyUrl}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: COLORS.textFaint, paddingTop: 8 }}>
          Toutes les données (joueurs, barème, amendes) sont enregistrées automatiquement.
        </p>
          </>
        )}
      </main>

      {toast && (
        <div
          className="toast-in"
          style={{ position: "fixed", bottom: 84, left: "50%", background: COLORS.red, color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "9px 16px", borderRadius: 999, boxShadow: "0 4px 14px rgba(0,0,0,0.4)", zIndex: 30, display: "flex", alignItems: "center", gap: 8 }}
        >
          <SoccerBall size={16} className="ball-bounce" />
          {toast}
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: `linear-gradient(0deg, ${COLORS.bg} 0%, ${COLORS.panelSoft} 100%)`,
          borderTop: `1px solid ${COLORS.panelBorder}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`, padding: "6px 6px 4px" }}>
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setViewingPlayerId(null);
                  setTab(t.id);
                }}
                className="press"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "8px 2px 7px",
                  margin: "0 2px",
                  borderRadius: 12,
                  background: active ? `${COLORS.red}1c` : "none",
                  border: "none",
                  color: active ? COLORS.red : COLORS.textFaint,
                  fontSize: 9.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
      </div>

      <div className="print-sheet" style={{ background: "#ffffff", color: "#111111", padding: 32, fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>FC Crissier — Caisse des amendes</h1>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "#444", margin: "0 0 24px" }}>Récapitulatif — {monthLabel(month)}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "2px solid #111", padding: "6px 4px" }}>Joueur</th>
              <th style={{ textAlign: "right", borderBottom: "2px solid #111", padding: "6px 4px" }}>Montant dû</th>
              <th style={{ textAlign: "center", borderBottom: "2px solid #111", padding: "6px 4px", width: 90 }}>Payé</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((r) => (
              <tr key={r.name}>
                <td style={{ borderBottom: "1px solid #ccc", padding: "8px 4px" }}>{r.name}</td>
                <td style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: "8px 4px" }}>{r.total.toFixed(2)}.-</td>
                <td style={{ borderBottom: "1px solid #ccc", padding: "8px 4px" }}></td>
              </tr>
            ))}
            {teamTotal > 0 && (
              <tr>
                <td style={{ borderBottom: "1px solid #ccc", padding: "8px 4px", fontStyle: "italic" }}>Équipe (collectif)</td>
                <td style={{ textAlign: "right", borderBottom: "1px solid #ccc", padding: "8px 4px" }}>{teamTotal.toFixed(2)}.-</td>
                <td style={{ borderBottom: "1px solid #ccc", padding: "8px 4px" }}></td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: "10px 4px", fontWeight: 700, borderTop: "2px solid #111" }}>Total</td>
              <td style={{ textAlign: "right", padding: "10px 4px", fontWeight: 700, borderTop: "2px solid #111" }}>{grandTotalMonth.toFixed(2)}.-</td>
              <td style={{ borderTop: "2px solid #111" }}></td>
            </tr>
          </tfoot>
        </table>
        <p style={{ fontSize: 11, color: "#666", marginTop: 24 }}>Paiement dû le dernier vendredi du mois, lors de l'entraînement.</p>
      </div>
    </div>
  );
}
