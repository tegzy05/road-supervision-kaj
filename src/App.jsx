import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin, Camera, Send, CheckCircle2, Clock, RotateCcw, X, RefreshCw, AlertCircle, Mail,
  Map as MapIcon, List, TrendingUp, ClipboardCheck, Layers, AlertTriangle, Coins,
  ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp, Building2, User,
} from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import emailjs from "@emailjs/browser";

/* ============================================================
   СПРАВОЧНИКИ
   ============================================================ */

const ROADS = [
  { name: "Астана - Щучинск", category: 1, since: "2013" },
  { name: "Астана - Темиртау", category: 1, since: "янв 2019" },
  { name: "Алматы - Хоргос", category: 1, since: "янв 2019" },
  { name: "Алматы - Конаев", category: 1, since: "янв 2019" },
  { name: "Астана - Павлодар", category: 1, since: "ноя 2021" },
  { name: "Тараз - Кайнар", category: 2, since: "ноя 2021" },
  { name: "Шымкент - Кызылорда", category: 2, since: "ноя 2021" },
  { name: "Шымкент - Тараз", category: 1, since: "ноя 2021" },
  { name: "Шымкент - гр. Узбекистана", category: 1, since: "ноя 2021" },
  { name: "Конаев - Талдыкорган", category: 2, since: "ноя 2021" },
  { name: "Щучинск - Кокшетау", category: 2, since: "ноя 2021" },
  { name: "Павлодар - Калбатау", category: 2, since: "2023" },
  { name: "Бейнеу - Акжигит", category: 2, since: "2023" },
  { name: "Уральск - Самара", category: 1, since: "2023" },
  { name: "Павлодар - Омск", category: 2, since: "2023" },
  { name: "Кокшетау - Петропавловск", category: 2, since: "2023" },
  { name: "Уральск - Саратов", category: 2, since: "2023" },
  { name: "Кызылорда - Аральск", category: 2, since: "2025" },
  { name: "Костанай - гр. РФ (Троицк)", category: 2, since: "2025" },
  { name: "Актобе - гр. РФ (Оренбург)", category: 2, since: "2025" },
  { name: "Костанай - Денисовка", category: 2, since: "2025" },
  { name: "Обход г. Тараз", category: 1, since: "2025" },
  { name: "Балхаш - Бурылбайтал", category: 2, since: "2025" },
  { name: "Шу - Бурылбайтал", category: 2, since: "2025" },
  { name: "Кандыагаш - Макат", category: 2, since: "2025" },
  { name: "Ушарал - Достык", category: 2, since: "2025" },
  { name: "Караганда - Балхаш - Бурылбайтал", category: 2, since: "10.07.2026" },
  { name: "Бурылбайтал - Курты", category: 2, since: "10.07.2026" },
  { name: "Талдыкорган - Усть-Каменогорск", category: 2, since: "11.07.2026" },
];

// Типы работ / контроля — используются во всех трёх формах
const WORK_TYPES = [
  "Земляное полотно",
  "Основание дорожной одежды",
  "Асфальтобетонное покрытие",
  "Бетонные работы (ИССО, водопропускные трубы)",
  "Армирование",
  "Дорожная разметка",
  "Дорожные знаки / ограждения",
  "Освещение",
  "Водоотвод / дренаж",
  "Другое",
];

// Единицы измерения объёмов работ
const UNITS = ["м²", "м³", "п.м", "тонна", "шт", "км"];

// Типы записей (унифицированная модель)
const ENTRY_TYPES = {
  stage: { label: "Приёмка этапа", icon: ClipboardCheck, color: "#2563EB", bg: "#DBEAFE" },
  hidden: { label: "Акт скрытых работ", icon: Layers, color: "#7C3AED", bg: "#EDE9FE" },
  defect: { label: "Дефект", icon: AlertTriangle, color: "#DC2626", bg: "#FEE2E2" },
  volume: { label: "Объём работ", icon: Coins, color: "#16A34A", bg: "#DCFCE7" },
};

// Заключение технадзора (для этапов и скрытых работ)
const CONCLUSION = {
  pass: { label: "Соответствует", color: "#16A34A", bg: "#DCFCE7" },
  fail: { label: "Не соответствует", color: "#DC2626", bg: "#FEE2E2" },
};

// Статус дефекта
const DEFECT_STATUS = {
  open: { label: "Открыт", color: "#DC2626", bg: "#FEE2E2" },
  fixing: { label: "Устраняется", color: "#EA580C", bg: "#FFEDD5" },
  closed: { label: "Устранён", color: "#16A34A", bg: "#DCFCE7" },
};

// Надзор КАЖ над решением технадзора
const KAJ_STATUS = {
  pending: { label: "Не проверено", color: "#6B7280", bg: "#F3F4F6", icon: ShieldQuestion },
  confirmed: { label: "Подтверждено", color: "#16A34A", bg: "#DCFCE7", icon: ShieldCheck },
  disputed: { label: "Оспорено", color: "#DC2626", bg: "#FEE2E2", icon: ShieldAlert },
};

const STORAGE_KEY = "road_supervision_entries_v1";
const EMAIL_LOG_KEY = "road_supervision_email_log_v1";
const KAZAKHSTAN_CENTER = [48.0196, 66.9237];

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";
const EMAIL_CONFIGURED = Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);

if (EMAIL_CONFIGURED) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

/* ============================================================
   УТИЛИТЫ
   ============================================================ */

function compressImageForEmail(dataUrl, maxSize = 480, quality = 0.55) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function logEmailEvent(entry) {
  try {
    const raw = localStorage.getItem(EMAIL_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ id: uid(), sentAt: Date.now(), ...entry });
    localStorage.setItem(EMAIL_LOG_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error("Email log error", e);
  }
}

// Реальная отправка через EmailJS, либо демо-режим (лог в localStorage), если не сконфигурировано
async function sendEmailNotification({ to, subject, body, photoDataUrl }) {
  if (!EMAIL_CONFIGURED) {
    logEmailEvent({ to, subject, body, real: false });
    return { real: false, ok: true };
  }
  try {
    let photoAttachment = null;
    if (photoDataUrl) {
      photoAttachment = await compressImageForEmail(photoDataUrl);
    }
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: to,
      subject,
      message: body,
      photo_attachment: photoAttachment || "",
    });
    logEmailEvent({ to, subject, body, real: true });
    return { real: true, ok: true };
  } catch (e) {
    console.error("EmailJS send error", e);
    logEmailEvent({ to, subject, body, real: false, error: true });
    return { real: false, ok: false };
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  return `${Math.floor(hr / 24)} дн назад`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Storage error", e);
  }
}

function money(n) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("ru-RU") + " тг";
}

/* ============================================================
   МЕЛКИЕ UI-КОМПОНЕНТЫ
   ============================================================ */

function Badge({ label, color, bg, small }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: bg,
        color: color,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        padding: small ? "2px 8px" : "3px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type, small }) {
  const t = ENTRY_TYPES[type];
  const Icon = t.icon;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, background: t.bg, color: t.color,
        fontSize: small ? 11 : 12, fontWeight: 600, padding: small ? "2px 8px" : "3px 10px", borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={small ? 11 : 13} /> {t.label}
    </span>
  );
}

function KajBadge({ status, small }) {
  const s = KAJ_STATUS[status || "pending"];
  const Icon = s.icon;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.color,
        fontSize: small ? 11 : 12, fontWeight: 600, padding: small ? "2px 8px" : "3px 10px", borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={small ? 11 : 13} /> {s.label}
    </span>
  );
}

function CameraCapture({ photos, onPhotosChange }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setError("");
    setStarting(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Браузер не поддерживает доступ к камере (нужен HTTPS или localhost)");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e) {
      setError(
        e.name === "NotAllowedError"
          ? "Доступ к камере запрещён. Разрешите доступ в настройках браузера и попробуйте снова."
          : e.message || "Не удалось открыть камеру"
      );
    } finally {
      setStarting(false);
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const takeShot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onPhotosChange([...photos, { id: uid(), src: dataUrl, takenAt: Date.now() }]);
  };

  const removePhoto = (id) => {
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div>
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative", width: 72, height: 72 }}>
              <img
                src={p.src}
                alt="Снимок"
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "0.5px solid var(--border-strong, #d1d5db)" }}
              />
              <button
                onClick={() => removePhoto(p.id)}
                aria-label="Удалить снимок"
                style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                  background: "#DC2626", color: "#fff", border: "2px solid #fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {cameraOpen ? (
        <div style={{ border: "0.5px solid var(--border-strong, #d1d5db)", borderRadius: 10, overflow: "hidden", background: "#000" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, padding: 8, background: "var(--surface-1, #f9fafb)" }}>
            <button onClick={takeShot} style={{ ...btnPrimary, marginTop: 0, flex: 1 }}>
              <Camera size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
              Снять кадр
            </button>
            <button onClick={closeCamera} style={btnSecondary}>
              Готово
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openCamera} disabled={starting} style={btnSecondary}>
          <Camera size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
          {starting ? "Открываем камеру..." : photos.length > 0 ? "Сделать ещё фото" : "Открыть камеру"}
        </button>
      )}

      {error && (
        <div style={{ ...noteBox, background: "#FEF2F2", color: "#991B1B", display: "flex", alignItems: "flex-start", gap: 6, marginTop: 8 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-primary)" }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function LocationField({ coords, setCoords, error }) {
  const [locStatus, setLocStatus] = useState("idle");
  const [locError, setLocError] = useState("");

  const getLocation = () => {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Браузер не поддерживает геолокацию");
      return;
    }
    setLocStatus("getting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLocStatus("ok");
      },
      (err) => {
        setLocStatus("idle");
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Доступ к геолокации запрещён. Разрешите его в настройках браузера и попробуйте снова.");
        } else if (err.code === err.TIMEOUT) {
          setLocError("Не удалось определить местоположение за отведённое время. Попробуйте ещё раз, лучше на открытом месте.");
        } else {
          setLocError("Не удалось определить местоположение. Проверьте, включена ли геолокация на устройстве.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <Field label="Геолокация участка" error={error || locError}>
      {coords ? (
        <div>
          <div style={{ ...input, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <MapPin size={16} color="#16A34A" />
            {coords.lat}, {coords.lng}
            {typeof coords.accuracy === "number" && (
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>±{coords.accuracy} м</span>
            )}
          </div>
          <button onClick={getLocation} disabled={locStatus === "getting"} style={{ ...btnSecondary, marginTop: 6, height: 32, fontSize: 12.5 }}>
            <RefreshCw size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
            {locStatus === "getting" ? "Уточняем..." : "Уточнить местоположение"}
          </button>
        </div>
      ) : (
        <button onClick={getLocation} disabled={locStatus === "getting"} style={btnSecondary}>
          <MapPin size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
          {locStatus === "getting" ? "Определяем..." : "Определить местоположение"}
        </button>
      )}
    </Field>
  );
}

/* ============================================================
   ФОРМА ТЕХНАДЗОРА
   ============================================================ */

const ENTRY_TABS = [
  { key: "stage", label: "Приёмка этапа" },
  { key: "hidden", label: "Скрытые работы" },
  { key: "defect", label: "Дефект" },
  { key: "volume", label: "Объём работ" },
];

function TechForm({ onSubmit }) {
  const [entryType, setEntryType] = useState("stage");
  const [road, setRoad] = useState("");
  const [km, setKm] = useState("");
  const [contractor, setContractor] = useState("");
  const [engineerName, setEngineerName] = useState("");
  const [workType, setWorkType] = useState("");
  const [coords, setCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  // приёмка этапа / скрытые работы
  const [conclusion, setConclusion] = useState("pass");
  const [volumePlanned, setVolumePlanned] = useState("");
  const [volumeActual, setVolumeActual] = useState("");
  const [unit, setUnit] = useState(UNITS[0]);

  // дефект
  const [severity, setSeverity] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");

  // объём работ на оплату
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const reset = () => {
    setRoad(""); setKm(""); setContractor(""); setWorkType(""); setCoords(null);
    setPhotos([]); setComment(""); setErrors({}); setConclusion("pass");
    setVolumePlanned(""); setVolumeActual(""); setSeverity("medium"); setDeadline("");
    setContractorEmail(""); setQuantity(""); setUnitPrice(""); setSent(false);
  };

  const validate = () => {
    const e = {};
    if (!road) e.road = "Выберите платную дорогу";
    if (!km) e.km = "Укажите километраж / участок";
    if (!contractor) e.contractor = "Укажите подрядчика";
    if (!engineerName) e.engineerName = "Укажите ваше имя (инженер технадзора)";
    if (!coords) e.coords = "Определите геолокацию";
    if (photos.length === 0) e.photo = "Приложите хотя бы одно фото";
    if (entryType !== "volume" && !workType) e.workType = "Выберите вид работ";
    if (entryType === "defect" && !deadline) e.deadline = "Укажите срок устранения";
    if (entryType === "volume" && !quantity) e.quantity = "Укажите объём";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const base = {
      id: uid(),
      type: entryType,
      road, km, contractor, engineerName,
      photos: photos.map((p) => p.src),
      lat: coords.lat, lng: coords.lng,
      comment,
      createdAt: Date.now(),
      kajStatus: "pending",
      kajComment: "",
    };
    let entry;
    if (entryType === "stage" || entryType === "hidden") {
      entry = {
        ...base, workType, conclusion,
        volumePlanned: volumePlanned || null,
        volumeActual: volumeActual || null,
        unit,
      };
    } else if (entryType === "defect") {
      entry = {
        ...base, workType, severity, deadline,
        contractorEmail,
        status: "open",
        fixPhotos: [],
      };
    } else {
      entry = {
        ...base, workType: workType || "Не указан",
        quantity, unit, unitPrice: unitPrice || null,
        sum: unitPrice ? Number(quantity) * Number(unitPrice) : null,
      };
    }
    const list = loadEntries();
    saveEntries([entry, ...list]);
    onSubmit();
    setSent(true);
  };

  if (sent) {
    return (
      <div style={wrap}>
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <CheckCircle2 size={44} color="#16A34A" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 500 }}>Запись сохранена</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
            Запись появится в панели КАЖ для проверки.
          </p>
          <button onClick={reset} style={btnSecondary}>Добавить ещё запись</button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>Технадзор — новая запись</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "0 0 16px" }}>
          Фиксируйте приёмку этапов, акты скрытых работ, дефекты и объёмы прямо на месте.
        </p>

        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {ENTRY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setEntryType(t.key)}
              style={{ ...chip, ...(entryType === t.key ? chipActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Field label="Платная дорога" error={errors.road}>
          <select value={road} onChange={(e) => setRoad(e.target.value)} style={input}>
            <option value="">Выберите дорогу (всего 28 участков)</option>
            {ROADS.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Километраж / участок" error={errors.km}>
              <input value={km} onChange={(e) => setKm(e.target.value)} placeholder="напр. км 45–48" style={input} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Подрядчик" error={errors.contractor}>
              <input value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="Название организации" style={input} />
            </Field>
          </div>
        </div>

        <Field label="Инженер технадзора (вы)" error={errors.engineerName}>
          <input value={engineerName} onChange={(e) => setEngineerName(e.target.value)} placeholder="ФИО" style={input} />
        </Field>

        {entryType !== "volume" && (
          <Field label="Вид работ" error={errors.workType}>
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} style={input}>
              <option value="">Выберите вид работ</option>
              {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
        )}

        {(entryType === "stage" || entryType === "hidden") && (
          <>
            <Field label="Заключение">
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(CONCLUSION).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setConclusion(k)}
                    style={{
                      ...btnSecondary, flex: 1,
                      background: conclusion === k ? v.bg : "transparent",
                      color: conclusion === k ? v.color : "var(--text-primary)",
                      borderColor: conclusion === k ? v.color : "var(--border-strong, #d1d5db)",
                      fontWeight: conclusion === k ? 600 : 400,
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Объём по проекту" hint="необязательно">
                  <input value={volumePlanned} onChange={(e) => setVolumePlanned(e.target.value)} placeholder="0" style={input} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Объём фактический" hint="необязательно">
                  <input value={volumeActual} onChange={(e) => setVolumeActual(e.target.value)} placeholder="0" style={input} />
                </Field>
              </div>
              <div style={{ width: 90 }}>
                <Field label="Ед.">
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} style={input}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            {entryType === "hidden" && (
              <div style={{ ...noteBox, background: "#F5F3FF", color: "#5B21B6" }}>
                <Layers size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                Акт скрытых работ фиксирует состояние до укладки следующего слоя — после этого визуально проверить будет нельзя.
              </div>
            )}
          </>
        )}

        {entryType === "defect" && (
          <>
            <Field label="Серьёзность">
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { k: "low", label: "Незначительный", color: "#CA8A04" },
                  { k: "medium", label: "Средний", color: "#EA580C" },
                  { k: "high", label: "Критичный", color: "#DC2626" },
                ].map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setSeverity(s.k)}
                    style={{
                      ...btnSecondary, flex: 1, fontSize: 12.5,
                      background: severity === s.k ? s.color : "transparent",
                      color: severity === s.k ? "#fff" : "var(--text-primary)",
                      borderColor: severity === s.k ? s.color : "var(--border-strong, #d1d5db)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Срок устранения" error={errors.deadline}>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={input} />
            </Field>
            <Field label="Email подрядчика (необязательно)" hint="Уведомим, когда КАЖ подтвердит или закроет дефект">
              <input type="email" value={contractorEmail} onChange={(e) => setContractorEmail(e.target.value)} placeholder="contractor@example.com" style={input} />
            </Field>
          </>
        )}

        {entryType === "volume" && (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Field label="Объём (кол-во)" error={errors.quantity}>
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" style={input} />
              </Field>
            </div>
            <div style={{ width: 90 }}>
              <Field label="Ед.">
                <select value={unit} onChange={(e) => setUnit(e.target.value)} style={input}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Цена за ед., тг" hint="необязательно">
                <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" style={input} />
              </Field>
            </div>
          </div>
        )}

        <LocationField coords={coords} setCoords={setCoords} error={errors.coords} />

        <Field label={`Фото${photos.length ? ` (${photos.length})` : ""}`} error={errors.photo}
          hint="Можно сделать несколько кадров и удалить неудачные перед отправкой.">
          <CameraCapture photos={photos} onPhotosChange={setPhotos} />
        </Field>

        <Field label="Комментарий (необязательно)">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Дополнительные детали"
            style={{ ...input, resize: "vertical", fontFamily: "inherit", paddingTop: 8 }}
          />
        </Field>

        <button onClick={handleSubmit} style={btnPrimary}>
          <Send size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
          Сохранить запись
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   КАРТА И СТАТИСТИКА
   ============================================================ */

function markerColor(entry) {
  if (entry.type === "defect") return DEFECT_STATUS[entry.status].color;
  if (entry.type === "volume") return ENTRY_TYPES.volume.color;
  return CONCLUSION[entry.conclusion]?.color || ENTRY_TYPES[entry.type].color;
}

function EntriesMap({ entries, onSelect }) {
  if (entries.length === 0) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
        Пока нет записей на карте.
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "0.5px solid var(--border, #e5e7eb)" }}>
      <MapContainer center={KAZAKHSTAN_CENTER} zoom={5} style={{ height: 420, width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {entries.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 2, fillColor: markerColor(r), fillOpacity: 0.9 }}
            eventHandlers={{ click: () => onSelect(r) }}
          >
            <Popup>
              <div style={{ fontSize: 13, minWidth: 160 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{ENTRY_TYPES[r.type].label}</div>
                <div style={{ color: "#6b7280", marginBottom: 4 }}>{r.road} · {r.km}</div>
                <button
                  onClick={() => onSelect(r)}
                  style={{ border: "none", background: "#111827", color: "#fff", fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
                >
                  Открыть детали
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function RoadStatsPanel({ entries }) {
  const byRoad = {};
  entries.forEach((r) => {
    if (!byRoad[r.road]) byRoad[r.road] = { defects_open: 0, defects_fixing: 0, defects_closed: 0, fails: 0, total: 0 };
    byRoad[r.road].total++;
    if (r.type === "defect") byRoad[r.road][`defects_${r.status}`]++;
    if ((r.type === "stage" || r.type === "hidden") && r.conclusion === "fail") byRoad[r.road].fails++;
  });
  const sorted = Object.entries(byRoad).sort((a, b) => b[1].total - a[1].total);
  if (sorted.length === 0) return null;
  const maxTotal = sorted[0][1].total;

  return (
    <div style={{ ...card, padding: "1rem 1.1rem", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <TrendingUp size={15} color="var(--text-secondary)" />
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>Дороги по числу записей</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(([road, s]) => (
          <div key={road}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
              <span style={{ color: "var(--text-primary)" }}>{road}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {s.total} {s.defects_open > 0 && <span style={{ color: "#DC2626" }}>· {s.defects_open} открытых деф.</span>}
                {s.fails > 0 && <span style={{ color: "#EA580C" }}> · {s.fails} несоотв.</span>}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: "var(--border, #e5e7eb)" }}>
              <div style={{ width: `${(s.total / maxTotal) * 100}%`, height: "100%", background: "#2563EB" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ПАНЕЛЬ КАЖ — НАДЗОР НАД ТЕХНАДЗОРОМ
   ============================================================ */

function EntryDetailModal({ entry, onClose, onKajDecision, onDefectStatusChange }) {
  const [kajComment, setKajComment] = useState(entry.kajComment || "");
  const [disputing, setDisputing] = useState(false);
  const [resolvingDefect, setResolvingDefect] = useState(false);

  const t = ENTRY_TYPES[entry.type];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}
      onClick={onClose}
    >
      <div style={{ ...card, width: 420, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
          <TypeBadge type={entry.type} />
          <KajBadge status={entry.kajStatus} />
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 500 }}>{entry.road} · {entry.km}</h3>

        {entry.photos && entry.photos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Фото технадзора</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entry.photos.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "0.5px solid var(--border, #e5e7eb)" }} />
              ))}
            </div>
          </div>
        )}

        {entry.type === "defect" && entry.fixPhotos && entry.fixPhotos.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#16A34A", marginBottom: 4 }}>Фото после устранения</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entry.fixPhotos.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1.5px solid #16A34A" }} />
              ))}
            </div>
          </div>
        )}

        <table style={{ width: "100%", fontSize: 13, marginBottom: 14 }}>
          <tbody>
            <tr><td style={tdLabel}>Подрядчик</td><td style={tdVal}>{entry.contractor}</td></tr>
            <tr><td style={tdLabel}>Инженер</td><td style={tdVal}>{entry.engineerName}</td></tr>
            {entry.workType && <tr><td style={tdLabel}>Вид работ</td><td style={tdVal}>{entry.workType}</td></tr>}
            {(entry.type === "stage" || entry.type === "hidden") && (
              <tr><td style={tdLabel}>Заключение</td><td style={tdVal}><Badge {...CONCLUSION[entry.conclusion]} small /></td></tr>
            )}
            {(entry.volumePlanned || entry.volumeActual) && (
              <tr><td style={tdLabel}>Объём</td><td style={tdVal}>план {entry.volumePlanned || "—"} / факт {entry.volumeActual || "—"} {entry.unit}</td></tr>
            )}
            {entry.type === "volume" && (
              <>
                <tr><td style={tdLabel}>Кол-во</td><td style={tdVal}>{entry.quantity} {entry.unit}</td></tr>
                <tr><td style={tdLabel}>Цена / ед.</td><td style={tdVal}>{money(entry.unitPrice)}</td></tr>
                <tr><td style={tdLabel}>Сумма</td><td style={tdVal}><b>{money(entry.sum)}</b></td></tr>
              </>
            )}
            {entry.type === "defect" && (
              <>
                <tr><td style={tdLabel}>Статус</td><td style={tdVal}><Badge {...DEFECT_STATUS[entry.status]} small /></td></tr>
                <tr><td style={tdLabel}>Срок устранения</td><td style={tdVal}>{entry.deadline}</td></tr>
              </>
            )}
            <tr><td style={tdLabel}>Координаты</td><td style={tdVal}>{entry.lat}, {entry.lng}</td></tr>
            <tr><td style={tdLabel}>Внесено</td><td style={tdVal}>{timeAgo(entry.createdAt)}</td></tr>
            {entry.comment && <tr><td style={tdLabel}>Комментарий</td><td style={tdVal}>{entry.comment}</td></tr>}
          </tbody>
        </table>

        {entry.type === "defect" && entry.status !== "closed" && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setResolvingDefect(true)}
              style={{ ...btnSecondary, color: "#16A34A", width: "100%" }}
            >
              Отметить устранённым (фото обязательно)
            </button>
          </div>
        )}

        <div style={{ borderTop: "0.5px solid var(--border, #e5e7eb)", paddingTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <ShieldCheck size={14} /> Надзор КАЖ над решением технадзора
          </div>
          <textarea
            value={kajComment}
            onChange={(e) => setKajComment(e.target.value)}
            rows={2}
            placeholder="Комментарий КАЖ (например, причина оспаривания)"
            style={{ ...input, resize: "vertical", fontFamily: "inherit", paddingTop: 8, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onKajDecision(entry.id, "confirmed", kajComment)}
              style={{ ...btnSecondary, flex: 1, color: "#16A34A", borderColor: "#16A34A" }}
            >
              <ShieldCheck size={14} style={{ marginRight: 5, verticalAlign: -2 }} /> Подтвердить
            </button>
            <button
              onClick={() => setDisputing(true)}
              style={{ ...btnSecondary, flex: 1, color: "#DC2626", borderColor: "#DC2626" }}
            >
              <ShieldAlert size={14} style={{ marginRight: 5, verticalAlign: -2 }} /> Оспорить
            </button>
          </div>
          {disputing && (
            <div style={{ ...noteBox, background: "#FEF2F2", color: "#991B1B", marginTop: 8 }}>
              Оспорить решение технадзора без комментария нельзя. Опишите причину выше и нажмите ещё раз «Оспорить».
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => {
                    if (!kajComment.trim()) return;
                    onKajDecision(entry.id, "disputed", kajComment);
                    setDisputing(false);
                  }}
                  style={{ ...btnPrimary, marginTop: 0, background: "#DC2626" }}
                  disabled={!kajComment.trim()}
                >
                  Подтвердить оспаривание
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ ...btnSecondary, width: "100%", marginTop: 12 }}>Закрыть</button>

        {resolvingDefect && (
          <ResolveDefectModal
            onCancel={() => setResolvingDefect(false)}
            onConfirm={(photoSrc) => {
              onDefectStatusChange(entry.id, "closed", photoSrc);
              setResolvingDefect(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResolveDefectModal({ onCancel, onConfirm }) {
  const [photos, setPhotos] = useState([]);
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}
      onClick={onCancel}
    >
      <div style={{ ...card, width: 360, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 500 }}>Подтвердить устранение дефекта</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 14px" }}>
          Сделайте фото отремонтированного участка — оно автоматически уйдёт подрядчику вместе с уведомлением, если указан email.
        </p>
        <CameraCapture photos={photos} onPhotosChange={setPhotos} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} style={{ ...btnSecondary, flex: 1 }}>Отмена</button>
          <button
            onClick={() => onConfirm(photos[0]?.src)}
            disabled={photos.length === 0}
            style={{ ...btnPrimary, marginTop: 0, flex: 1, opacity: photos.length === 0 ? 0.5 : 1 }}
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ entries, refresh }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [kajFilter, setKajFilter] = useState("all");
  const [roadFilter, setRoadFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("list");
  const [emailToast, setEmailToast] = useState(null);
  const [expandedContractor, setExpandedContractor] = useState(null);

  const filtered = entries.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (kajFilter !== "all" && (r.kajStatus || "pending") !== kajFilter) return false;
    if (roadFilter !== "all" && r.road !== roadFilter) return false;
    return true;
  });

  const notify = async (to, subject, body, photoDataUrl) => {
    if (!to) return;
    const result = await sendEmailNotification({ to, subject, body, photoDataUrl });
    setEmailToast({ to, subject, real: result.real, ok: result.ok });
    setTimeout(() => setEmailToast(null), 6000);
  };

  const updateEntry = (id, patch) => {
    const list = loadEntries();
    const updated = list.map((r) => (r.id === id ? { ...r, ...patch } : r));
    saveEntries(updated);
    refresh();
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
    return updated.find((r) => r.id === id);
  };

  const handleKajDecision = (id, kajStatus, kajComment) => {
    const updated = updateEntry(id, { kajStatus, kajComment });
    if (updated && updated.type === "defect" && updated.contractorEmail) {
      notify(
        updated.contractorEmail,
        kajStatus === "disputed" ? "КАЖ оспорил решение по дефекту" : "КАЖ подтвердил решение по дефекту",
        `Дорога: ${updated.road}, участок ${updated.km}. Комментарий КАЖ: ${kajComment || "—"}`
      );
    }
  };

  const handleDefectStatusChange = (id, status, fixPhoto) => {
    const updated = updateEntry(id, {
      status,
      fixPhotos: fixPhoto ? [fixPhoto] : [],
    });
    if (updated && updated.contractorEmail) {
      notify(
        updated.contractorEmail,
        "Дефект отмечен как устранённый",
        `Дорога: ${updated.road}, участок ${updated.km}. Технадзор подтвердил устранение дефекта.`,
        fixPhoto
      );
    }
  };

  const counts = {
    all: entries.length,
    stage: entries.filter((r) => r.type === "stage").length,
    hidden: entries.filter((r) => r.type === "hidden").length,
    defect: entries.filter((r) => r.type === "defect").length,
    volume: entries.filter((r) => r.type === "volume").length,
  };

  const kajCounts = {
    all: entries.length,
    pending: entries.filter((r) => (r.kajStatus || "pending") === "pending").length,
    confirmed: entries.filter((r) => r.kajStatus === "confirmed").length,
    disputed: entries.filter((r) => r.kajStatus === "disputed").length,
  };

  const openDefects = entries.filter((r) => r.type === "defect" && r.status !== "closed").length;
  const totalVolumeSum = entries.filter((r) => r.type === "volume" && r.sum).reduce((s, r) => s + r.sum, 0);
  const failCount = entries.filter((r) => (r.type === "stage" || r.type === "hidden") && r.conclusion === "fail").length;

  const roadsWithEntries = [...new Set(entries.map((r) => r.road))];

  // Сводка по подрядчикам
  const byContractor = {};
  entries.forEach((r) => {
    const c = r.contractor || "Не указан";
    if (!byContractor[c]) byContractor[c] = { total: 0, defects_open: 0, fails: 0, disputed: 0, sum: 0, roads: new Set() };
    byContractor[c].total++;
    byContractor[c].roads.add(r.road);
    if (r.type === "defect" && r.status !== "closed") byContractor[c].defects_open++;
    if ((r.type === "stage" || r.type === "hidden") && r.conclusion === "fail") byContractor[c].fails++;
    if (r.kajStatus === "disputed") byContractor[c].disputed++;
    if (r.type === "volume" && r.sum) byContractor[c].sum += r.sum;
  });
  const contractorRows = Object.entries(byContractor).sort((a, b) => b[1].total - a[1].total);

  return (
    <div style={{ ...wrap, maxWidth: 760 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>Панель КАЖ — надзор над технадзором</h2>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>
          Сеть: 28 платных участков, 6 290,59 км (13 участков I категории, 15 участков II–III категории)
        </p>
      </div>

      {emailToast && (
        <div
          style={{
            ...noteBox,
            background: emailToast.ok ? (emailToast.real ? "#ECFDF5" : "#EFF6FF") : "#FEF2F2",
            color: emailToast.ok ? (emailToast.real ? "#065F46" : "#1E40AF") : "#991B1B",
            marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <Mail size={14} style={{ flexShrink: 0 }} />
          <span>
            {emailToast.ok
              ? emailToast.real
                ? <>Письмо реально отправлено на {emailToast.to}: «{emailToast.subject}»</>
                : <>[Демо-режим, EmailJS не настроен] Письмо было бы отправлено на {emailToast.to}: «{emailToast.subject}»</>
              : <>Не удалось отправить письмо на {emailToast.to}</>}
          </span>
        </div>
      )}

      {/* Сводные показатели */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        <div style={{ ...card, padding: "0.8rem 1rem" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>Открытых дефектов</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#DC2626" }}>{openDefects}</div>
        </div>
        <div style={{ ...card, padding: "0.8rem 1rem" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>Несоответствий</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#EA580C" }}>{failCount}</div>
        </div>
        <div style={{ ...card, padding: "0.8rem 1rem" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>Оспорено КАЖ</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#DC2626" }}>{kajCounts.disputed}</div>
        </div>
        <div style={{ ...card, padding: "0.8rem 1rem" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>Объём к оплате</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#16A34A" }}>{money(totalVolumeSum)}</div>
        </div>
      </div>

      <RoadStatsPanel entries={entries} />

      {/* Сводка по подрядчикам */}
      {contractorRows.length > 0 && (
        <div style={{ ...card, padding: "1rem 1.1rem", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Building2 size={15} color="var(--text-secondary)" />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>Сводка по подрядчикам</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {contractorRows.map(([name, s]) => (
              <div key={name}>
                <div
                  onClick={() => setExpandedContractor((e) => (e === name ? null : name))}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "6px 0", cursor: "pointer" }}
                >
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
                    <span>{s.roads.size} дорог(и)</span>
                    {s.defects_open > 0 && <span style={{ color: "#DC2626" }}>{s.defects_open} деф.</span>}
                    {s.disputed > 0 && <span style={{ color: "#DC2626" }}>{s.disputed} оспор.</span>}
                    {s.sum > 0 && <span style={{ color: "#16A34A" }}>{money(s.sum)}</span>}
                    {expandedContractor === name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
                {expandedContractor === name && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 4, paddingBottom: 8 }}>
                    Всего записей: {s.total} · Несоответствий: {s.fails} · Дороги: {[...s.roads].join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => setView("list")} style={{ ...chip, ...(view === "list" ? chipActive : {}), display: "flex", alignItems: "center", gap: 5 }}>
          <List size={13} /> Список
        </button>
        <button onClick={() => setView("map")} style={{ ...chip, ...(view === "map" ? chipActive : {}), display: "flex", alignItems: "center", gap: 5 }}>
          <MapIcon size={13} /> Карта
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {["all", "stage", "hidden", "defect", "volume"].map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)} style={{ ...chip, ...(typeFilter === f ? chipActive : {}) }}>
            {f === "all" ? "Все типы" : ENTRY_TYPES[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {["all", "pending", "confirmed", "disputed"].map((f) => (
          <button key={f} onClick={() => setKajFilter(f)} style={{ ...chip, ...(kajFilter === f ? chipActive : {}) }}>
            {f === "all" ? "Любой статус КАЖ" : KAJ_STATUS[f].label} ({kajCounts[f]})
          </button>
        ))}
      </div>

      {roadsWithEntries.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <select value={roadFilter} onChange={(e) => setRoadFilter(e.target.value)} style={{ ...input, maxWidth: 320 }}>
            <option value="all">Все дороги</option>
            {roadsWithEntries.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {view === "map" ? (
        <EntriesMap entries={filtered} onSelect={setSelected} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
          Нет записей в этой категории. Добавьте запись через форму технадзора, чтобы увидеть её здесь.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{ ...card, padding: "0.9rem 1.1rem", cursor: "pointer" }} onClick={() => setSelected(r)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                {r.photos && r.photos[0] && (
                  <img src={r.photos[0]} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <TypeBadge type={r.type} small />
                    {r.type === "defect" && <Badge {...DEFECT_STATUS[r.status]} small />}
                    {(r.type === "stage" || r.type === "hidden") && <Badge {...CONCLUSION[r.conclusion]} small />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                    {r.road} · {r.km}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Building2 size={12} /> {r.contractor}
                    <User size={12} style={{ marginLeft: 8 }} /> {r.engineerName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> {timeAgo(r.createdAt)}
                  </div>
                </div>
                <KajBadge status={r.kajStatus} small />
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <EntryDetailModal
          entry={selected}
          onClose={() => setSelected(null)}
          onKajDecision={handleKajDecision}
          onDefectStatusChange={handleDefectStatusChange}
        />
      )}
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

export default function App() {
  const [view, setView] = useState("tech");
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const seedDemo = () => {
    const now = Date.now();
    const demo = [
      {
        id: uid(), type: "stage", road: "Алматы - Хоргос", km: "км 120–124", contractor: "КазДорСтрой",
        engineerName: "А. Сериков", workType: "Асфальтобетонное покрытие", conclusion: "pass",
        volumePlanned: "4500", volumeActual: "4500", unit: "м²",
        photos: [], lat: 43.234, lng: 77.891, comment: "", createdAt: now - 3600e3,
        kajStatus: "confirmed", kajComment: "Проверено выборочно, замечаний нет.",
      },
      {
        id: uid(), type: "hidden", road: "Астана - Павлодар", km: "км 15–18", contractor: "ДорСервис Астана",
        engineerName: "Б. Ахметова", workType: "Основание дорожной одежды", conclusion: "fail",
        volumePlanned: "3000", volumeActual: "2650", unit: "м³",
        photos: [], lat: 51.112, lng: 75.55, comment: "Толщина слоя ниже проектной на отдельных участках.",
        createdAt: now - 7200e3, kajStatus: "pending", kajComment: "",
      },
      {
        id: uid(), type: "defect", road: "Алматы - Конаев", km: "км 8", contractor: "КазДорСтрой",
        engineerName: "А. Сериков", workType: "Асфальтобетонное покрытие", severity: "high",
        deadline: new Date(now + 7 * 86400e3).toISOString().slice(0, 10),
        contractorEmail: "", status: "open", fixPhotos: [],
        photos: [], lat: 43.6, lng: 77.4, comment: "Трещина на всю ширину полосы.",
        createdAt: now - 86400e3 * 2, kajStatus: "confirmed", kajComment: "Согласен, требует немедленного устранения.",
      },
      {
        id: uid(), type: "volume", road: "Шымкент - Тараз", km: "км 30–45", contractor: "ЮгДорСтрой",
        engineerName: "Н. Касымов", workType: "Асфальтобетонное покрытие", quantity: "12000", unit: "м²",
        unitPrice: "8500", sum: 102000000,
        photos: [], lat: 42.9, lng: 69.6, comment: "", createdAt: now - 1800e3,
        kajStatus: "disputed", kajComment: "Запрошена лабораторная проверка фактического объёма.",
      },
    ];
    saveEntries(demo);
    refresh();
  };

  const clearAll = () => {
    saveEntries([]);
    refresh();
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setView("tech")} style={{ ...tab, ...(view === "tech" ? tabActive : {}) }}>
          Форма технадзора
        </button>
        <button onClick={() => setView("dashboard")} style={{ ...tab, ...(view === "dashboard" ? tabActive : {}) }}>
          Панель КАЖ {entries.length > 0 ? `(${entries.length})` : ""}
        </button>
        <div style={{ flex: 1 }} />
        {view === "dashboard" && entries.length === 0 && (
          <button onClick={seedDemo} style={btnSecondary}>Заполнить демо-данными</button>
        )}
        {entries.length > 0 && (
          <button onClick={clearAll} style={{ ...iconToggle, color: "var(--text-muted)" }} title="Очистить все данные">
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      {!loaded ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>Загрузка...</div>
      ) : view === "tech" ? (
        <TechForm onSubmit={refresh} />
      ) : (
        <Dashboard entries={entries} refresh={refresh} />
      )}
    </div>
  );
}

/* ============================================================
   СТИЛИ
   ============================================================ */

const wrap = { maxWidth: 520, margin: "0 auto" };
const card = {
  background: "var(--surface-2, #fff)",
  border: "0.5px solid var(--border, #e5e7eb)",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
};
const input = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  borderRadius: 8,
  border: "0.5px solid var(--border-strong, #d1d5db)",
  background: "var(--surface-1, #f9fafb)",
  fontSize: 14,
  color: "var(--text-primary)",
  boxSizing: "border-box",
};
const btnPrimary = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  border: "none",
  background: "#EA580C",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  marginTop: 6,
};
const btnSecondary = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: "0.5px solid var(--border-strong, #d1d5db)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 13.5,
  cursor: "pointer",
};
const iconToggle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "0.5px solid var(--border, #e5e7eb)",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
const tab = {
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  border: "0.5px solid var(--border, #e5e7eb)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 13.5,
  fontWeight: 500,
  cursor: "pointer",
};
const tabActive = {
  background: "var(--text-primary, #111827)",
  color: "var(--surface-2, #fff)",
  borderColor: "transparent",
};
const chip = {
  height: 30,
  padding: "0 12px",
  borderRadius: 999,
  border: "0.5px solid var(--border, #e5e7eb)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12.5,
  cursor: "pointer",
};
const chipActive = {
  background: "var(--text-primary, #111827)",
  color: "#fff",
  borderColor: "transparent",
};
const noteBox = { fontSize: 12.5, padding: "8px 10px", borderRadius: 8, marginBottom: 10 };
const tdLabel = { color: "var(--text-secondary)", padding: "4px 8px 4px 0", verticalAlign: "top", whiteSpace: "nowrap" };
const tdVal = { color: "var(--text-primary)", padding: "4px 0", fontWeight: 500 };
