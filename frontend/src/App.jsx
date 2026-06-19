import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Analytics from "./Analytics";
import Budget from "./Budget";
import Chat from "./Chat";
import ShoppingList from "./ShoppingList";
import EditModal from "./EditModal";
import Compare from "./Compare";
import AdvancedAnalysis from "./AdvancedAnalysis";
import PriceAlerts from "./PriceAlerts";
import Trash from "./Trash";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

async function pdfToJpegBlob(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1.0 });
  const MAX_PX = 30000000; // safely under Groq's 33177600 px limit
  const scale = Math.min(2.0, Math.sqrt(MAX_PX / (base.width * base.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
}

// Para acceso móvil en red local: cambia localhost por tu IP local (ej: 192.168.1.50)
const LOCAL_IP = "localhost"; // ← PON AQUÍ TU IP LOCAL PARA MÓVIL
const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : `http://${LOCAL_IP}:3001/api`);
const UPLOADS = import.meta.env.VITE_UPLOADS_URL || (import.meta.env.PROD ? "" : `http://${LOCAL_IP}:3001/uploads`);

// ── Tema claro ─────────────────────────────────────────────────────────────────
const LIGHT_CSS = `
body,[data-theme=light]{background:#F0F4F8!important;color:#1A202C!important}
[data-theme=light] .app{background:#F0F4F8!important}
[data-theme=light] .sidebar{background:#FFFFFF!important;border-color:#E2E8F0!important}
[data-theme=light] .sidebar-header,[data-theme=light] .hist-list{border-color:#E2E8F0!important}
[data-theme=light] .hist-item:hover{background:rgba(5,150,105,.04)!important;border-color:#E2E8F0!important}
[data-theme=light] .hist-item.active{background:rgba(5,150,105,.08)!important;border-color:rgba(5,150,105,.3)!important}
[data-theme=light] .hist-store{color:#1A202C!important}
[data-theme=light] .main-nav{background:#FFFFFF!important;border-color:#E2E8F0!important}
[data-theme=light] .nav-tab{color:#718096!important}
[data-theme=light] .nav-tab.active{background:#F0F4F8!important;color:#059669!important}
[data-theme=light] .meta-card,[data-theme=light] .dash-card,[data-theme=light] .chart-box,
[data-theme=light] .detail-list,[data-theme=light] .totals-block,[data-theme=light] .items-table,
[data-theme=light] .store-card,[data-theme=light] .pattern-card,[data-theme=light] .an-tabs,
[data-theme=light] .cmp-tabs,[data-theme=light] .budget-card,[data-theme=light] .cat-card,
[data-theme=light] .settings-section,[data-theme=light] .pa-list,[data-theme=light] .trash-list,
[data-theme=light] .sl-item,[data-theme=light] .queue-item,[data-theme=light] .price-row{background:#FFFFFF!important;border-color:#E2E8F0!important}
[data-theme=light] .items-table th,[data-theme=light] .diff-table th{background:#F8FAFC!important;border-color:#E2E8F0!important}
[data-theme=light] .items-table td,[data-theme=light] .detail-row,[data-theme=light] .tot-row,
[data-theme=light] .store-row,[data-theme=light] .pa-item,[data-theme=light] .trash-item{border-color:#E2E8F0!important;color:#1A202C!important}
[data-theme=light] .tl,[data-theme=light] .tv{color:#718096!important}
[data-theme=light] .tot-row.grand .tv{color:#059669!important}
[data-theme=light] .sec-label{color:#059669!important}
[data-theme=light] .sec-label::after{background:#E2E8F0!important}
[data-theme=light] .search-inp{background:#F8FAFC!important;border-color:#E2E8F0!important;color:#1A202C!important}
[data-theme=light] .sort-btn{background:#F8FAFC!important;border-color:#E2E8F0!important;color:#718096!important}
[data-theme=light] .sort-btn.active{color:#059669!important;border-color:rgba(5,150,105,.4)!important;background:rgba(5,150,105,.06)!important}
[data-theme=light] .upload-zone{background:#FFFFFF!important;border-color:#E2E8F0!important}
[data-theme=light] .btn-primary{background:#059669!important;color:#FFFFFF!important}
[data-theme=light] .btn-primary:hover:not(:disabled){background:#047857!important}
[data-theme=light] .btn-ghost{border-color:#E2E8F0!important;color:#718096!important}
[data-theme=light] .hist-total,[data-theme=light] .meta-val.hi,[data-theme=light] .dash-val.green{color:#059669!important}
[data-theme=light] .badge{background:rgba(5,150,105,.1)!important;color:#059669!important;border-color:rgba(5,150,105,.2)!important}
[data-theme=light] .grid-bg{opacity:.2!important}
[data-theme=light] .logo-icon{background:#059669!important}
[data-theme=light] .logo-text span{color:#059669!important}
[data-theme=light] .tag-chip{background:#F8FAFC!important;border-color:#E2E8F0!important;color:#718096!important}
[data-theme=light] .tag-chip.active{color:#059669!important;border-color:rgba(5,150,105,.35)!important;background:rgba(5,150,105,.06)!important}
[data-theme=light] .hist-tag{background:rgba(8,145,178,.1)!important;color:#0891B2!important;border-color:rgba(8,145,178,.2)!important}
[data-theme=light] .settings-title{color:#059669!important}
[data-theme=light] .settings-lbl{color:#1A202C!important}
[data-theme=light] .settings-desc,[data-theme=light] .hist-date,[data-theme=light] .logo-sub,
[data-theme=light] .meta-lbl,[data-theme=light] .dash-label,[data-theme=light] .chart-title{color:#A0AEC0!important}
[data-theme=light] .progress-track,[data-theme=light] .store-bar-wrap{background:#E2E8F0!important}
`;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0E1A;color:#E8EDF5;font-family:'Syne',sans-serif;min-height:100vh}
.app{display:flex;min-height:100vh;background:#0A0E1A;position:relative;overflow:hidden}
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,160,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,160,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0}
.sidebar{width:280px;flex-shrink:0;background:#080C14;border-right:1px solid #1E2A3A;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:1}
.sidebar-header{padding:18px 18px 12px;border-bottom:1px solid #1E2A3A;flex-shrink:0}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:2px}
.logo-icon{width:34px;height:34px;background:#00E5A0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.logo-text{font-size:17px;font-weight:800;letter-spacing:-.5px}
.logo-text span{color:#00E5A0}
.logo-sub{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;letter-spacing:2px;text-transform:uppercase}
.sidebar-search{padding:0 10px 6px;flex-shrink:0}
.search-inp-wrap{position:relative}
.search-inp-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4A5568;font-size:12px;pointer-events:none}
.search-inp{width:100%;background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:8px 10px 8px 30px;color:#E8EDF5;font-size:12px;font-family:'Space Mono',monospace;outline:none;transition:border-color .15s}
.search-inp:focus{border-color:rgba(0,229,160,.4)}
.search-inp::placeholder{color:#2D3748}
.search-mode-row{display:flex;gap:3px;padding:0 10px 6px;flex-shrink:0}
.sm-btn{flex:1;background:#111827;border:1px solid #1E2A3A;border-radius:5px;color:#4A5568;font-size:9px;font-family:'Space Mono',monospace;cursor:pointer;padding:4px 2px;transition:all .15s}
.sm-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.sort-row{display:flex;gap:4px;padding:0 10px 8px;flex-shrink:0}
.sort-btn{flex:1;background:#111827;border:1px solid #1E2A3A;border-radius:5px;color:#4A5568;font-size:9px;font-family:'Space Mono',monospace;cursor:pointer;padding:5px 2px;transition:all .15s;letter-spacing:.5px}
.sort-btn:hover{color:#E8EDF5;border-color:#4A5568}
.sort-btn.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.tag-filter{padding:0 10px 6px;display:flex;gap:4px;flex-wrap:wrap;flex-shrink:0}
.tag-chip{font-family:'Space Mono',monospace;font-size:9px;padding:2px 8px;border-radius:20px;border:1px solid #1E2A3A;background:#111827;color:#4A5568;cursor:pointer;transition:all .15s}
.tag-chip.active{border-color:rgba(0,229,160,.35);color:#00E5A0;background:rgba(0,229,160,.06)}
.sidebar-title{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;letter-spacing:2px;text-transform:uppercase;padding:8px 18px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ticket-count{background:rgba(0,229,160,.1);color:#00E5A0;border:1px solid rgba(0,229,160,.2);border-radius:20px;padding:1px 8px;font-size:10px}
.hist-list{flex:1;overflow-y:auto;padding:0 10px 10px}
.hist-list::-webkit-scrollbar{width:4px}
.hist-list::-webkit-scrollbar-thumb{background:#1E2A3A;border-radius:2px}
.hist-item{padding:11px 12px;border-radius:8px;cursor:pointer;border:1px solid transparent;margin-bottom:4px;transition:all .15s}
.hist-item:hover{background:rgba(0,229,160,.04);border-color:#1E2A3A}
.hist-item.active{background:rgba(0,229,160,.08);border-color:rgba(0,229,160,.25)}
.hist-store{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hist-meta{display:flex;justify-content:space-between;align-items:center;margin-top:4px}
.hist-date{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568}
.hist-total{font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:#00E5A0}
.hist-tags{display:flex;gap:3px;flex-wrap:wrap;margin-top:4px}
.hist-tag{font-family:'Space Mono',monospace;font-size:8px;padding:1px 5px;border-radius:20px;background:rgba(0,184,255,.1);color:#00B8FF;border:1px solid rgba(0,184,255,.2)}
.hist-match{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hist-empty{padding:20px 18px;text-align:center;color:#2D3748;font-size:12px;font-family:'Space Mono',monospace}
.del-btn{background:none;border:none;cursor:pointer;color:#2D3748;font-size:12px;padding:2px 4px;border-radius:4px;transition:color .15s;line-height:1;flex-shrink:0}
.del-btn:hover{color:#EF4444}
.hist-item-top{display:flex;justify-content:space-between;align-items:flex-start}
.online-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.main{flex:1;overflow-y:auto;position:relative;z-index:1}
.main-inner{max-width:740px;margin:0 auto;padding:28px 24px 60px}
.main-nav{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:22px;background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:4px}
.nav-tab{padding:7px 10px;border-radius:7px;border:none;background:transparent;color:#4A5568;font-family:'Syne',sans-serif;font-weight:700;font-size:11px;cursor:pointer;transition:all .15s}
.nav-tab:hover{color:#E8EDF5}
.nav-tab.active{background:#0A0E1A;color:#00E5A0;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.upload-zone{border:2px dashed #1E2A3A;border-radius:16px;padding:48px 32px;text-align:center;cursor:pointer;transition:all .2s;background:#111827;position:relative;overflow:hidden}
.upload-zone:hover,.upload-zone.drag{border-color:#00E5A0;background:rgba(0,229,160,.04)}
.upload-zone input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.up-icon{font-size:40px;margin-bottom:12px;display:block}
.up-title{font-size:16px;font-weight:700;margin-bottom:6px}
.up-hint{font-family:'Space Mono',monospace;font-size:11px;color:#4A5568;line-height:1.7}
.up-hint b{color:#00E5A0;font-weight:400}
.offline-banner{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#FCD34D;font-family:'Space Mono',monospace}
.preview-wrap{border-radius:16px;overflow:hidden;background:#111827;border:1px solid #1E2A3A;position:relative}
.preview-wrap img{width:100%;max-height:340px;object-fit:contain;display:block;background:#0D1220}
.preview-bar{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(10,14,26,.92));padding:18px 16px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.preview-name{font-family:'Space Mono',monospace;font-size:10px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;border:none;transition:all .15s}
.btn-primary{background:#00E5A0;color:#0A0E1A}
.btn-primary:hover:not(:disabled){background:#00FFB2;transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,229,160,.3)}
.btn-primary:disabled{opacity:.45;cursor:not-allowed}
.btn-ghost{background:transparent;color:#6B7280;border:1px solid #1E2A3A}
.btn-ghost:hover{border-color:#4A5568;color:#E8EDF5}
.loading-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:22px;text-align:center;margin-top:18px}
.load-label{font-family:'Space Mono',monospace;font-size:11px;color:#00E5A0;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px}
.spinner{width:13px;height:13px;border:2px solid rgba(0,229,160,.3);border-top-color:#00E5A0;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.prog-track{height:3px;background:#1E2A3A;border-radius:2px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,#00E5A0,#00B8FF);border-radius:2px;animation:prog 2.5s ease-in-out infinite}
@keyframes prog{0%{width:0%;margin-left:0}50%{width:70%;margin-left:0}100%{width:0%;margin-left:100%}}
.error-box{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:14px 18px;color:#FCA5A5;font-size:14px;margin-top:14px}
.results{margin-top:20px;animation:fadeUp .35s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sec-label{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#00E5A0;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:1px;background:#1E2A3A}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px;margin-bottom:20px}
.meta-card{background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:13px 15px}
.meta-lbl{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}
.meta-val{font-size:14px;font-weight:700}
.meta-val.hi{color:#00E5A0;font-size:18px}
.items-table{width:100%;border-collapse:collapse;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1E2A3A;margin-bottom:20px}
.items-table th{background:#0D1220;font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1.5px;padding:10px 14px;text-align:left;border-bottom:1px solid #1E2A3A}
.items-table th:last-child,.items-table td:last-child{text-align:right}
.items-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(30,42,58,.5);vertical-align:middle}
.items-table tr:last-child td{border-bottom:none}
.items-table tr:hover td{background:rgba(0,229,160,.02)}
.i-name{font-weight:600}
.i-qty{font-family:'Space Mono',monospace;font-size:12px;color:#6B7280}
.i-up{font-family:'Space Mono',monospace;font-size:11px;color:#4A5568}
.i-tot{font-family:'Space Mono',monospace;font-weight:700;font-size:13px}
.dup-warn{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:9px 14px;margin-bottom:12px;font-size:12px;color:#FCD34D;font-family:'Space Mono',monospace}
.totals-block{background:#111827;border:1px solid #1E2A3A;border-radius:12px;overflow:hidden;margin-bottom:20px}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid rgba(30,42,58,.5);font-size:14px}
.tot-row:last-child{border-bottom:none}
.tot-row.grand{background:rgba(0,229,160,.06);font-weight:800;font-size:16px}
.tot-row.grand .tv{color:#00E5A0}
.tl{color:#6B7280}
.tv{font-family:'Space Mono',monospace;font-weight:700}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:10px;font-family:'Space Mono',monospace;font-weight:700;background:rgba(0,229,160,.1);color:#00E5A0;border:1px solid rgba(0,229,160,.2)}
.center-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:55vh;color:#2D3748;text-align:center;gap:10px}
.center-empty .ei{font-size:48px}
.center-empty p{font-family:'Space Mono',monospace;font-size:12px}
.prod-search-wrap{position:relative;margin-bottom:12px}
.prod-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#4A5568;font-size:13px;pointer-events:none}
.prod-search{width:100%;background:#111827;border:1px solid #1E2A3A;border-radius:7px;padding:9px 12px 9px 34px;color:#E8EDF5;font-size:13px;outline:none;transition:border-color .15s}
.prod-search:focus{border-color:rgba(0,229,160,.4)}
.prod-search::placeholder{color:#2D3748}
.queue-list{margin-bottom:20px}
.queue-item{background:#111827;border:1px solid #1E2A3A;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px}
.queue-thumb{width:48px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#0D1220}
.queue-name{font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.queue-status{font-family:'Space Mono',monospace;font-size:10px;flex-shrink:0}
.queue-status.pending{color:#4A5568}
.queue-status.processing{color:#00E5A0}
.queue-status.done{color:#34D399}
.queue-status.error{color:#F87171}
.queue-status.offline{color:#FCD34D}
.tag-add-input{background:#111827;border:1px solid #1E2A3A;border-radius:6px;padding:6px 10px;color:#E8EDF5;font-size:12px;font-family:'Space Mono',monospace;outline:none;width:120px;transition:border-color .15s}
.tag-add-input:focus{border-color:rgba(0,229,160,.4)}
.tag-add-input::placeholder{color:#2D3748}
.tick-tag{font-family:'Space Mono',monospace;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(0,184,255,.1);color:#00B8FF;border:1px solid rgba(0,184,255,.2);cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:4px}
.tick-tag:hover{background:rgba(239,68,68,.1);color:#F87171;border-color:rgba(239,68,68,.2)}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.dash-card{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px 18px}
.dash-label{font-family:'Space Mono',monospace;font-size:9px;color:#4A5568;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
.dash-val{font-size:24px;font-weight:800;line-height:1}
.dash-sub{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:4px}
.store-row{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid rgba(30,42,58,.5);cursor:pointer;transition:background .15s}
.store-row:hover{background:rgba(0,229,160,.02)}
.store-row:last-child{border-bottom:none}
.store-name{font-size:13px;font-weight:700}
.store-meta{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:2px}
.store-bar-wrap{width:100%;height:3px;background:#1E2A3A;border-radius:2px;margin-top:4px}
.store-bar-fill{height:100%;background:linear-gradient(90deg,#00E5A0,#00B8FF);border-radius:2px}
.settings-section{background:#111827;border:1px solid #1E2A3A;border-radius:12px;padding:16px;margin-bottom:14px}
.settings-title{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
.settings-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(30,42,58,.5)}
.settings-row:last-child{border-bottom:none}
.settings-lbl{font-size:13px;font-weight:600}
.settings-desc{font-family:'Space Mono',monospace;font-size:10px;color:#4A5568;margin-top:2px}
.gallery-img{width:100%;max-height:300px;object-fit:contain;border-radius:10px;border:1px solid #1E2A3A;background:#0D1220;display:block;margin-bottom:14px}
.share-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#00E5A0;color:#0A0E1A;padding:10px 22px;border-radius:30px;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;z-index:200;animation:fadeUp .25s ease}
.kbd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
.kbd-box{background:#0D1220;border:1px solid #1E2A3A;border-radius:16px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto}
.kbd-title{font-size:16px;font-weight:800;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
.kbd-section{font-family:'Space Mono',monospace;font-size:9px;color:#00E5A0;text-transform:uppercase;letter-spacing:2px;margin:14px 0 8px}
.kbd-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(30,42,58,.4)}
.kbd-row:last-child{border-bottom:none}
.kbd-desc{font-size:12px;color:#6B7280}
.kbd-key{font-family:'Space Mono',monospace;font-size:11px;background:#1E2A3A;color:#E8EDF5;padding:2px 8px;border-radius:5px;border:1px solid #2D3748}
.custom-cat-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(30,42,58,.4)}
.custom-cat-row:last-child{border-bottom:none}
.form-inp-sm{background:#0D1220;border:1px solid #1E2A3A;border-radius:6px;padding:6px 10px;color:#E8EDF5;font-size:12px;font-family:'Syne',sans-serif;outline:none;transition:border-color .15s}
.form-inp-sm:focus{border-color:rgba(0,229,160,.4)}
.fab{position:fixed;bottom:calc(72px + env(safe-area-inset-bottom));right:18px;width:54px;height:54px;border-radius:50%;background:#00E5A0;color:#0A0E1A;border:none;font-size:22px;cursor:pointer;box-shadow:0 4px 20px rgba(0,229,160,.45);z-index:30;display:none;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s}
.fab:active{transform:scale(.9);box-shadow:0 2px 10px rgba(0,229,160,.3)}
.sidebar-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:29;backdrop-filter:blur(2px);cursor:pointer}
.mobile-historial-btn{display:none}
.sidebar-close-mobile{display:none!important}
@media(max-width:680px){
  .fab{display:flex}
  .sidebar-backdrop{display:block}
  .mobile-historial-btn{display:flex;align-items:center;gap:8px;background:#111827;border:1px solid #1E2A3A;color:#E8EDF5;border-radius:8px;padding:9px 14px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:16px;width:100%}
  .sidebar-close-mobile{display:flex!important;background:none;border:none;color:#4A5568;font-size:22px;cursor:pointer;padding:4px 8px;border-radius:6px;flex-shrink:0}
  .sidebar{position:fixed;top:0;left:0;bottom:0;width:88%;max-width:310px;height:100dvh;z-index:30;transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);max-height:100%;overflow:hidden}
  .sidebar.sidebar-open{transform:translateX(0)}
  .main-nav{position:fixed;bottom:0;left:0;right:0;padding-bottom:env(safe-area-inset-bottom);border-radius:0;border:none;border-top:1px solid #1E2A3A;margin:0;z-index:20;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;padding-left:4px;padding-right:4px;padding-top:6px;scrollbar-width:none;gap:2px;background:#111827}
  .main-nav::-webkit-scrollbar{display:none}
  .nav-tab{font-size:10px;padding:8px 12px;flex-shrink:0;white-space:nowrap;min-height:44px}
  .main{width:100%}
  .main-inner{padding:16px 14px calc(80px + env(safe-area-inset-bottom)) 14px}
  .dash-grid{grid-template-columns:1fr 1fr}
  .hist-item{padding:12px 12px;min-height:44px}
  .del-btn{min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center}
  .btn{min-height:44px}
  .nav-tab.active{box-shadow:none;border-bottom:2px solid #00E5A0;border-radius:0;background:transparent;color:#00E5A0;padding-bottom:6px}
}
@media(min-width:681px){
  .fab{display:none}
  .mobile-historial-btn{display:none}
}
`;

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
};

function detectDuplicates(productos) {
  if (!productos?.length) return [];
  const count = {};
  productos.forEach(p => { const k = p.nombre?.toLowerCase().trim(); if (k) count[k] = (count[k]||0)+1; });
  return Object.entries(count).filter(([,v])=>v>1).map(([k])=>k);
}

async function notificar(titulo, cuerpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission === "granted") new Notification(titulo, { body: cuerpo, icon: "/icon-192.png" });
}

// ── Atajos de teclado overlay ─────────────────────────────────────────────────
function ShortcutsOverlay({ onClose }) {
  return (
    <div className="kbd-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="kbd-box">
        <div className="kbd-title">
          ⌨️ Atajos de teclado
          <button onClick={onClose} style={{background:"none",border:"none",color:"#4A5568",cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div className="kbd-section">Navegación</div>
        {[["d","Dashboard"],["a","Análisis"],["n","Escanear"],["l","Lista compra"],["b","Presupuesto"],["c","Comparar"],["S","Ajustes"]].map(([k,desc])=>(
          <div key={k} className="kbd-row"><span className="kbd-desc">{desc}</span><span className="kbd-key">{k}</span></div>
        ))}
        <div className="kbd-section">Acciones</div>
        {[["s","Enfocar búsqueda"],["Esc","Cerrar / Volver"],["?","Mostrar atajos"],["1-7","Navegar tabs"]].map(([k,desc])=>(
          <div key={k} className="kbd-row"><span className="kbd-desc">{desc}</span><span className="kbd-key">{k}</span></div>
        ))}
      </div>
    </div>
  );
}

// ── Ticket content compartido ─────────────────────────────────────────────────
const TAG_PALETTE = ["#00B8FF","#00E5A0","#7C3AED","#F59E0B","#EF4444","#EC4899","#10B981","#6366F1"];

function TicketContent({ data, ticketId, onExportJSON, onExportCSV, onExportXLSX, extra, header, onTagAdd, onTagRemove, tagColors={}, onTagColorChange }) {
  const [prodSearch, setProdSearch] = useState("");
  const [newTag, setNewTag] = useState("");
  const [colorPickerTag, setColorPickerTag] = useState(null);

  const productos = data.productos || [];
  const dups = detectDuplicates(productos);
  const filtered = prodSearch.trim()
    ? productos.filter(p => p.nombre?.toLowerCase().includes(prodSearch.toLowerCase()))
    : productos;

  const addTag = async () => {
    if (!newTag.trim() || !ticketId) return;
    await fetch(`${API}/tickets/${ticketId}/tags`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ tag: newTag.trim() })
    });
    setNewTag(""); onTagAdd?.();
  };

  return (
    <div className="results">
      {header}
      {dups.length > 0 && <div className="dup-warn">⚠️ Posibles duplicados: {dups.join(", ")}</div>}

      <div className="sec-label">Información general</div>
      <div className="meta-grid">
        {data.tienda && <div className="meta-card"><div className="meta-lbl">Tienda</div><div className="meta-val">{data.tienda}</div></div>}
        {(data.fecha||data.fecha_compra) && <div className="meta-card"><div className="meta-lbl">Fecha</div><div className="meta-val">{data.fecha||data.fecha_compra}</div></div>}
        {data.hora && <div className="meta-card"><div className="meta-lbl">Hora</div><div className="meta-val">{data.hora}</div></div>}
        {data.ticket_num!=null && <div className="meta-card"><div className="meta-lbl">Nº Ticket</div><div className="meta-val">{data.ticket_num}</div></div>}
        {data.metodo_pago && <div className="meta-card"><div className="meta-lbl">Pago</div><div className="meta-val">{data.metodo_pago}</div></div>}
        {data.total!=null && <div className="meta-card"><div className="meta-lbl">Total</div><div className="meta-val hi">{fmt(data.total)}</div></div>}
      </div>

      {productos.length > 0 && (
        <>
          <div className="sec-label">Productos <span className="badge">{filtered.length}{prodSearch?` / ${productos.length}`:""}</span></div>
          {productos.length > 8 && (
            <div className="prod-search-wrap">
              <span className="prod-search-icon">🔍</span>
              <input className="prod-search" placeholder="Buscar producto…" value={prodSearch} onChange={e=>setProdSearch(e.target.value)}/>
            </div>
          )}
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:0}}>
          <table className="items-table" style={{marginBottom:0}}>
            <thead><tr><th>Producto</th><th>Uds</th><th>P. Unit</th><th>Total</th></tr></thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={i}>
                  <td className="i-name" style={dups.includes(p.nombre?.toLowerCase().trim())?{color:"#FCD34D"}:{}}>
                    {p.nombre}
                    {p.notas&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginTop:2}}>💬 {p.notas}</div>}
                  </td>
                  <td className="i-qty">×{p.cantidad}</td>
                  <td className="i-up">{fmt(p.precio_unitario)}</td>
                  <td className="i-tot">{fmt(p.precio_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {(() => {
        if (!productos.length || data.total == null) return null;
        const sum = productos.reduce((s, p) => s + (parseFloat(p.precio_total) || 0), 0);
        const diff = Math.abs(sum - parseFloat(data.total));
        if (diff < 0.05 || sum === 0) return null;
        return (
          <div style={{background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontFamily:"'Space Mono',monospace",fontSize:10,color:"#FCD34D"}}>
            ⚠️ Suma productos ({fmt(sum)}) ≠ total ({fmt(data.total)}) · diferencia {fmt(diff)}
          </div>
        );
      })()}

      {(data.subtotal!=null||data.iva!=null||data.total!=null) && (
        <>
          <div className="sec-label">Resumen</div>
          <div className="totals-block">
            {data.subtotal!=null && <div className="tot-row"><span className="tl">Subtotal</span><span className="tv">{fmt(data.subtotal)}</span></div>}
            {data.descuentos!=null&&data.descuentos>0 && <div className="tot-row"><span className="tl">Descuentos</span><span className="tv" style={{color:"#34D399"}}>−{fmt(data.descuentos)}</span></div>}
            {data.iva!=null && <div className="tot-row"><span className="tl">IVA</span><span className="tv">{fmt(data.iva)}</span></div>}
            {data.total!=null && <div className="tot-row grand"><span>TOTAL</span><span className="tv">{fmt(data.total)}</span></div>}
          </div>
        </>
      )}

      {ticketId && (
        <>
          <div className="sec-label">Etiquetas</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
            {(data.tags||[]).map(tag => {
              const c = tagColors[tag]; const bg=c?`${c}22`:"rgba(0,184,255,.1)"; const fg=c||"#00B8FF"; const border=c?`${c}44`:"rgba(0,184,255,.2)";
              return (
                <span key={tag} style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
                  <span className="tick-tag" style={{background:bg,color:fg,borderColor:border,gap:4}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:fg,flexShrink:0,cursor:"pointer",display:"inline-block"}}
                      onClick={e=>{e.stopPropagation();setColorPickerTag(colorPickerTag===tag?null:tag);}}
                      title="Cambiar color"/>
                    {tag}
                    <span style={{opacity:.55,cursor:"pointer"}} onClick={()=>onTagRemove?.(tag)}>×</span>
                  </span>
                  {colorPickerTag===tag && (
                    <div style={{position:"absolute",bottom:"calc(100% + 5px)",left:0,zIndex:50,background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:8,padding:6,display:"flex",gap:4,flexWrap:"wrap",width:94,boxShadow:"0 4px 16px rgba(0,0,0,.6)"}}>
                      {TAG_PALETTE.map(pc=>(
                        <div key={pc} onClick={e=>{e.stopPropagation();onTagColorChange?.(tag,pc);setColorPickerTag(null);}}
                          style={{width:18,height:18,borderRadius:4,background:pc,cursor:"pointer",border:pc===fg?"2px solid #fff":"2px solid transparent",transition:"transform .1s"}}
                          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
                      ))}
                    </div>
                  )}
                </span>
              );
            })}
            <input className="tag-add-input" placeholder="+ Etiqueta" value={newTag}
              onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()}/>
            {newTag && <button className="btn btn-primary" style={{padding:"5px 12px",fontSize:12}} onClick={addTag}>Añadir</button>}
          </div>
        </>
      )}

      {data.notas && (
        <>
          <div className="sec-label">Notas</div>
          <div style={{background:"#080C14",border:"1px solid #1E2A3A",borderRadius:10,padding:"12px 16px",fontFamily:"'Space Mono',monospace",fontSize:12,color:"#4A5568",lineHeight:1.6,marginBottom:16}}>{data.notas}</div>
        </>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onExportJSON}>⬇ JSON</button>
        {productos.length>0 && <button className="btn btn-ghost" onClick={onExportCSV}>⬇ CSV</button>}
        {productos.length>0 && <button className="btn btn-ghost" onClick={onExportXLSX}>⬇ Excel</button>}
        {extra}
      </div>
    </div>
  );
}

// ── Scan Panel ────────────────────────────────────────────────────────────────
function ScanPanel({ onSaved, historial = [], currentUser }) {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [singleImage, setSingleImage] = useState(null);
  const [singleFile, setSingleFile] = useState(null);
  const [singleResult, setSingleResult] = useState(null);
  const [singleError, setSingleError] = useState(null);
  const [dupWarning, setDupWarning] = useState(null); // { message, file }
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState("single");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef();
  const queueInputRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Restore offline queue from localStorage
    const stored = localStorage.getItem("ts_offline_queue");
    if (stored) {
      try {
        const items = JSON.parse(stored);
        if (items.length) {
          setQueue(items.map(it => ({ ...it, status: "pending" })));
          setMode("queue");
          localStorage.removeItem("ts_offline_queue");
        }
      } catch {}
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t=>t.stop()); }, []);

  const startCamera = async () => {
    setSingleError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" }, audio:false });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch(e) { setSingleError("Cámara no disponible: " + e.message); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const captureFrame = () => {
    const v = videoRef.current; if (!v) return;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob(blob => {
      stopCamera();
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type:"image/jpeg" });
      handleSingleFile(file);
    }, "image/jpeg", 0.92);
  };

  // Auto-process queue when back online
  useEffect(() => {
    if (isOnline && queue.some(q => q.status === "pending") && !processing) {
      processQueue();
    }
  }, [isOnline]);

  const handleSingleFile = useCallback(async f => {
    if (!f) return;
    const isImg = f.type.startsWith("image/"), isPdf = f.type === "application/pdf";
    if (!isImg && !isPdf) return;
    setSingleResult(null); setSingleError(null);
    let fileToUse = f;
    if (isPdf) {
      try {
        const blob = await pdfToJpegBlob(f);
        fileToUse = new File([blob], f.name.replace(/\.pdf$/i, ".jpg"), { type: "image/jpeg" });
      } catch { setSingleError("No se pudo procesar el PDF."); return; }
    }
    setSingleFile(fileToUse);
    const r = new FileReader(); r.onload = e => setSingleImage(e.target.result); r.readAsDataURL(fileToUse);
  }, []);

  const analyzeFile = async (file, force = false) => {
    const b64 = await new Promise((res,rej) => {
      const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file);
    });
    const resp = await fetch(`${API}/analizar`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ imagen_base64: b64, media_type: file.type||"image/jpeg", force, subido_por: currentUser || null })
    });
    if (resp.status === 409) {
      const err = await resp.json();
      const e = new Error(err.error); e.isDuplicate = true; throw e;
    }
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error||"Error"); }
    return resp.json();
  };

  const analyzeSingle = async () => {
    if (!singleFile) return;
    if (!isOnline) {
      // Store offline
      const reader = new FileReader();
      reader.onload = () => {
        const stored = JSON.parse(localStorage.getItem("ts_offline_queue")||"[]");
        stored.push({ name: singleFile.name, type: singleFile.type, b64: reader.result.split(",")[1] });
        localStorage.setItem("ts_offline_queue", JSON.stringify(stored));
        setSingleError("Sin conexión. Ticket guardado — se procesará al volver a conectar.");
      };
      reader.readAsDataURL(singleFile);
      return;
    }
    setLoading(true); setSingleError(null); setSingleResult(null); setDupWarning(null);
    try {
      const datos = await analyzeFile(singleFile);
      setSingleResult(datos);
      onSaved();
      notificar("Ticket analizado", `${datos.tienda||"Ticket"} — ${fmt(datos.total)}`);
      if (datos.alertas_disparadas?.length) {
        datos.alertas_disparadas.forEach(a => {
          notificar("🎯 Alerta de precio", `${a.producto.nombre}: ${fmt(a.precio_visto)} en ${a.tienda}`);
        });
      }
      // Apply auto-tag rules
      try {
        const rules = JSON.parse(localStorage.getItem("ts_autotag_rules")||"[]");
        for (const rule of rules) {
          let match = false;
          if (rule.field==="tienda" && datos.tienda?.toLowerCase().includes(rule.value.toLowerCase())) match=true;
          if (rule.field==="total_gt" && datos.total > parseFloat(rule.value)) match=true;
          if (rule.field==="total_lt" && datos.total < parseFloat(rule.value)) match=true;
          if (match && datos.id) {
            await fetch(`${API}/tickets/${datos.id}/tags`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({tag:rule.tag}) });
          }
        }
      } catch {}
    } catch (err) {
      if (err.isDuplicate) { setDupWarning({ message: err.message, file: singleFile }); }
      else setSingleError(err.message);
    } finally { setLoading(false); }
  };

  const addToQueue = async (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    const items = await Promise.all(valid.map(async f => {
      if (f.type === "application/pdf") {
        try {
          const blob = await pdfToJpegBlob(f);
          const converted = new File([blob], f.name.replace(/\.pdf$/i, ".jpg"), { type: "image/jpeg" });
          return { file: converted, preview: URL.createObjectURL(converted), status:"pending", result:null, error:null };
        } catch { return null; }
      }
      return { file: f, preview: URL.createObjectURL(f), status:"pending", result:null, error:null };
    }));
    setQueue(prev => [...prev, ...items.filter(Boolean)]);
  };

  const processQueue = async () => {
    if (processing) return;
    setProcessing(true);
    let processed = 0;
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== "pending") continue;
      if (!navigator.onLine) {
        setQueue(prev => prev.map((it,j) => j===i ? {...it, status:"offline"} : it));
        continue;
      }
      // Wait between requests to avoid Groq rate limit (except before the first one)
      if (processed > 0) await new Promise(r => setTimeout(r, 4000));
      setQueue(prev => prev.map((it,j) => j===i ? {...it, status:"processing"} : it));
      try {
        const datos = await analyzeFile(queue[i].file);
        setQueue(prev => prev.map((it,j) => j===i ? {...it, status:"done", result:datos} : it));
        onSaved();
        notificar("Ticket analizado", `${datos.tienda||datos.id} — ${fmt(datos.total)}`);
      } catch (err) {
        const msg = err.isDuplicate ? `Duplicado: ${err.message}` : err.message;
        setQueue(prev => prev.map((it,j) => j===i ? {...it, status:"error", error:msg} : it));
      }
      processed++;
    }
    setProcessing(false);
  };

  const resetSingle = () => { setSingleImage(null); setSingleFile(null); setSingleResult(null); setSingleError(null); setDupWarning(null); };

  const exportJSON = d => { const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`ticket_${Date.now()}.json`; a.click(); };
  const exportCSV = d => {
    if (!d?.productos?.length) return;
    const rows = d.productos.map(p=>[`"${p.nombre}"`,p.cantidad,p.precio_unitario??"",p.precio_total??""].join(","));
    const b=new Blob(["﻿"+"Producto,Cantidad,P.Unitario,Total\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`ticket_${Date.now()}.csv`; a.click();
  };
  const exportXLSX = d => {
    if (!d?.productos?.length) return;
    const ws=XLSX.utils.json_to_sheet(d.productos.map(p=>({Producto:p.nombre,Cantidad:p.cantidad,"P.Unitario":p.precio_unitario,Total:p.precio_total,Categoría:p.categoria})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Productos");
    XLSX.writeFile(wb,`ticket_${d.tienda||Date.now()}.xlsx`);
  };

  return (
    <div>
      {!isOnline && <div className="offline-banner">📡 Sin conexión — los tickets se guardarán localmente y se procesarán al reconectar.</div>}

      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {[["single","📷 Un ticket"],["queue","📦 Cola de tickets"]].map(([v,l])=>(
          <button key={v} onClick={()=>setMode(v)} style={{flex:1,padding:"9px 14px",borderRadius:8,border:"1px solid #1E2A3A",
            background:mode===v?"#0A0E1A":"#111827",color:mode===v?"#00E5A0":"#4A5568",
            fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",
            boxShadow:mode===v?"0 1px 4px rgba(0,0,0,.4)":"none"}}>{l}</button>
        ))}
      </div>

      {mode==="single" ? (
        <>
          <canvas ref={canvasRef} style={{display:"none"}}/>
          {cameraActive ? (
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",background:"#000",marginBottom:8}}>
              <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",display:"block",maxHeight:340,objectFit:"cover"}}/>
              <div style={{position:"absolute",bottom:12,left:0,right:0,display:"flex",justifyContent:"center",gap:12}}>
                <button className="btn btn-ghost" onClick={stopCamera} style={{fontSize:13}}>✕ Cancelar</button>
                <button className="btn btn-primary" onClick={captureFrame} style={{fontSize:13,padding:"10px 24px"}}>⏺ Capturar</button>
              </div>
            </div>
          ) : !singleImage ? (
            <>
              <div className={`upload-zone ${drag?"drag":""}`}
                onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);handleSingleFile(e.dataTransfer.files[0]);}}
                onClick={()=>inputRef.current?.click()}>
                <input ref={inputRef} type="file" accept="image/*,application/pdf"
                  onChange={e=>handleSingleFile(e.target.files[0])} onClick={e=>e.stopPropagation()}/>
                <span className="up-icon">📷</span>
                <div className="up-title">Sube o escanea tu ticket</div>
                <div className="up-hint">Imagen o PDF — arrastra, haz clic, o <b>usa la cámara</b></div>
              </div>
              <button className="btn btn-ghost" style={{width:"100%",marginTop:8,fontSize:13}} onClick={startCamera}>
                📸 Cámara en tiempo real
              </button>
            </>
          ) : (
            <div className="preview-wrap">
              <img src={singleImage} alt="Ticket"/>
              <div className="preview-bar">
                <span className="preview-name">{singleFile?.name}</span>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" onClick={resetSingle}>✕ Cambiar</button>
                  <button className="btn btn-primary" onClick={analyzeSingle} disabled={loading}>
                    {loading?<><span className="spinner"/> Analizando…</>:"⚡ Analizar"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {loading && <div className="loading-card"><div className="load-label"><span className="spinner"/> Extrayendo datos…</div><div className="prog-track"><div className="prog-fill"/></div></div>}
          {dupWarning && (
            <div className="error-box" style={{background:"rgba(251,191,36,.06)",borderColor:"rgba(251,191,36,.3)"}}>
              ⚠️ {dupWarning.message}
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setDupWarning(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{fontSize:12}} onClick={async()=>{
                  setDupWarning(null); setLoading(true); setSingleError(null);
                  try {
                    const datos = await analyzeFile(dupWarning.file, true);
                    setSingleResult(datos); onSaved();
                    notificar("Ticket analizado", `${datos.tienda||"Ticket"} — ${fmt(datos.total)}`);
                  } catch(e){ setSingleError(e.message); } finally{ setLoading(false); }
                }}>Subir igualmente</button>
              </div>
            </div>
          )}
          {singleError && <div className="error-box">⚠️ {singleError}</div>}
          {singleResult && (
            <TicketContent data={singleResult} ticketId={singleResult.id} onTagAdd={()=>{}}
              onExportJSON={()=>exportJSON(singleResult)} onExportCSV={()=>exportCSV(singleResult)} onExportXLSX={()=>exportXLSX(singleResult)}
              extra={<button className="btn btn-ghost" onClick={resetSingle}>🔄 Nuevo</button>}/>
          )}
          {!singleImage && !singleResult && (
            <div className="center-empty" style={{marginTop:50}}><span className="ei">🧾</span><p>Sube un ticket para comenzar</p></div>
          )}
        </>
      ) : (
        <>
          <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
            <button className="btn btn-primary" onClick={()=>queueInputRef.current?.click()}>+ Añadir archivos</button>
            <input ref={queueInputRef} type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={e=>addToQueue(e.target.files)}/>
            {queue.some(q=>q.status==="pending")&&isOnline && (() => {
              const pending = queue.filter(q=>q.status==="pending").length;
              const secs = pending > 1 ? Math.ceil((pending * 4) / 60) : null;
              return (
                <button className="btn btn-primary" onClick={processQueue} disabled={processing}>
                  {processing
                    ? <><span className="spinner"/>Procesando…</>
                    : `⚡ Analizar ${pending}${secs ? ` (~${secs} min)` : ""}`}
                </button>
              );
            })()}
            {queue.length>0 && <button className="btn btn-ghost" onClick={()=>setQueue([])}>Limpiar</button>}
          </div>
          {queue.length===0 ? (
            <div className="center-empty" style={{marginTop:40}}><span className="ei">📦</span><p>Añade imágenes o PDFs para procesarlos en lote</p></div>
          ) : (
            <div className="queue-list">
              {queue.map((item,i)=>(
                <div key={i} className="queue-item">
                  <img className="queue-thumb" src={item.preview} alt=""/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="queue-name">{item.file?.name||item.name}</div>
                    {item.result && <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>{item.result.tienda} · {fmt(item.result.total)}</div>}
                    {item.error && <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#F87171"}}>{item.error}</div>}
                  </div>
                  <span className={`queue-status ${item.status}`}>
                    {item.status==="pending"?"En cola":item.status==="processing"?<><span className="spinner"/> Procesando</>:item.status==="done"?"✓ Listo":item.status==="offline"?"📡 Sin conexión":"✕ Error"}
                  </span>
                  <button className="del-btn" onClick={()=>setQueue(p=>p.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseTicketDate(str) {
  if (!str) return null;
  if (str.includes("/")) {
    const [d,m,y] = str.split("/");
    const dt = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str); return isNaN(dt.getTime()) ? null : dt;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ historial, onOpenTicket, onYearReview }) {
  if (!historial.length) return (
    <div className="center-empty"><span className="ei">📊</span><p>Sin datos todavía.<br/>Escanea tu primer ticket.</p></div>
  );
  const totalGastado = historial.reduce((s,t)=>s+(t.total||0),0);
  const avg = totalGastado/historial.length;
  const maxTicket = historial.reduce((m,t)=>(t.total||0)>(m.total||0)?t:m,historial[0]);
  const storeMap={};
  historial.forEach(t=>{const k=t.tienda||"Desconocida";if(!storeMap[k])storeMap[k]={count:0,total:0};storeMap[k].count++;storeMap[k].total+=t.total||0;});
  const stores=Object.entries(storeMap).sort((a,b)=>b[1].total-a[1].total);
  const maxStoreTotal=stores[0]?.[1].total||1;

  // Weekly summary
  const now = new Date();
  const dow = now.getDay();
  const thisMonday = new Date(now); thisMonday.setDate(now.getDate()+(dow===0?-6:1-dow)); thisMonday.setHours(0,0,0,0);
  const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate()-7);
  const thisSunday = new Date(thisMonday); thisSunday.setDate(thisMonday.getDate()+6); thisSunday.setHours(23,59,59,999);
  const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate()+6); lastSunday.setHours(23,59,59,999);
  const weekFilter = (from,to) => historial.filter(t=>{ const d=parseTicketDate(t.fecha_compra); return d&&d>=from&&d<=to; });
  const thisWeek = weekFilter(thisMonday, thisSunday);
  const lastWeek = weekFilter(lastMonday, lastSunday);
  const thisWeekTotal = thisWeek.reduce((s,t)=>s+(t.total||0),0);
  const lastWeekTotal = lastWeek.reduce((s,t)=>s+(t.total||0),0);
  const weekDiff = lastWeekTotal>0 ? Math.round(((thisWeekTotal-lastWeekTotal)/lastWeekTotal)*1000)/10 : null;

  // Year-over-year + forecast
  const thisMonthNum = now.getMonth();
  const thisYear = now.getFullYear();
  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const inMonth = (y,m) => historial.filter(t=>{ const d=parseTicketDate(t.fecha_compra); return d&&d.getFullYear()===y&&d.getMonth()===m; });
  const thisMonthTickets = inMonth(thisYear, thisMonthNum);
  const lastYearMonthTickets = inMonth(thisYear-1, thisMonthNum);
  const thisMonthSpend = thisMonthTickets.reduce((s,t)=>s+(t.total||0),0);
  const lastYearMonthSpend = lastYearMonthTickets.reduce((s,t)=>s+(t.total||0),0);
  const yoyChange = lastYearMonthSpend>0 ? Math.round(((thisMonthSpend-lastYearMonthSpend)/lastYearMonthSpend)*1000)/10 : null;
  const last3 = [1,2,3].map(off=>{ const d=new Date(thisYear,thisMonthNum-off,1); return inMonth(d.getFullYear(),d.getMonth()).reduce((s,t)=>s+(t.total||0),0); }).filter(v=>v>0);
  const avgMonthly = last3.length ? last3.reduce((a,b)=>a+b,0)/last3.length : 0;
  const daysInMonth = new Date(thisYear,thisMonthNum+1,0).getDate();
  const forecastPace = now.getDate()>0&&thisMonthSpend>0 ? Math.round((thisMonthSpend/now.getDate())*daysInMonth*100)/100 : 0;

  // Heatmap: build spend map by date
  const spendMap = useMemo(() => {
    const map = {};
    historial.forEach(t => {
      const d = parseTicketDate(t.fecha_compra); if (!d) return;
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      map[k] = (map[k]||0) + (t.total||0);
    });
    return map;
  }, [historial]);

  const heatmapWeeks = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(today); start.setDate(today.getDate() - 363);
    const weeks = [];
    for (let w = 0; w < 52; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start); date.setDate(start.getDate() + w*7 + d);
        const k = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
        week.push({ k, spend: spendMap[k]||0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [spendMap]);
  const maxDaySpend = Math.max(...Object.values(spendMap), 0.01);
  const getCellColor = s => !s?"rgba(30,42,58,.4)":`rgba(0,229,160,${0.12+Math.min(s/maxDaySpend,1)*0.88})`;

  // Family
  const famMap = {};
  historial.forEach(t=>{ if(!t.subido_por)return; if(!famMap[t.subido_por])famMap[t.subido_por]={total:0,count:0}; famMap[t.subido_por].total+=t.total||0; famMap[t.subido_por].count++; });
  const famEntries = Object.entries(famMap).sort((a,b)=>b[1].total-a[1].total);
  const maxFamTotal = famEntries[0]?.[1].total||1;

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <div className="sec-label">Esta semana</div>
      <div className="dash-grid" style={{marginBottom:22}}>
        <div className="dash-card"><div className="dash-label">Esta semana</div><div className="dash-val" style={{color:"#00E5A0"}}>{fmt(thisWeekTotal)}</div><div className="dash-sub">{thisWeek.length} ticket{thisWeek.length!==1?"s":""}</div></div>
        <div className="dash-card"><div className="dash-label">Semana pasada</div><div className="dash-val">{fmt(lastWeekTotal)}</div><div className="dash-sub">{lastWeek.length} ticket{lastWeek.length!==1?"s":""}</div></div>
        <div className="dash-card"><div className="dash-label">Diferencia</div>
          <div className="dash-val" style={{color:weekDiff==null?"#4A5568":weekDiff>0?"#F87171":"#34D399"}}>
            {weekDiff==null?"—":weekDiff>0?`+${weekDiff}%`:`${weekDiff}%`}
          </div>
          <div className="dash-sub">{weekDiff==null?"sin datos prev.":weekDiff>0?"más que la semana pasada":"menos que la semana pasada"}</div>
        </div>
      </div>
      {(yoyChange!==null||forecastPace>0) && (<>
        <div className="sec-label">{MONTHS_ES[thisMonthNum]} {thisYear}</div>
        <div className="dash-grid" style={{marginBottom:22}}>
          <div className="dash-card"><div className="dash-label">Gasto actual</div><div className="dash-val" style={{color:"#00E5A0"}}>{fmt(thisMonthSpend)}</div><div className="dash-sub">{thisMonthTickets.length} ticket{thisMonthTickets.length!==1?"s":""}</div></div>
          {yoyChange!==null && <div className="dash-card"><div className="dash-label">vs {MONTHS_ES[thisMonthNum]} {thisYear-1}</div><div className="dash-val" style={{color:yoyChange>10?"#F87171":yoyChange<-5?"#34D399":"#E8EDF5"}}>{yoyChange>0?`+${yoyChange}`:yoyChange}%</div><div className="dash-sub">{fmt(lastYearMonthSpend)} el año pasado</div></div>}
          {forecastPace>0 && <div className="dash-card"><div className="dash-label">Previsión fin de mes</div><div className="dash-val" style={{color:forecastPace>avgMonthly*1.15?"#F87171":forecastPace<avgMonthly*0.85?"#34D399":"#E8EDF5"}}>{fmt(forecastPace)}</div><div className="dash-sub">{avgMonthly>0?`media ${last3.length}m: ${fmt(avgMonthly)}`:"al ritmo actual"}</div></div>}
        </div>
      </>)}

      {famEntries.length>1 && (<>
        <div className="sec-label">Por usuario</div>
        <div className="totals-block" style={{marginBottom:22}}>
          {famEntries.map(([user,info])=>(
            <div key={user} className="store-row">
              <div style={{flex:1,minWidth:0}}>
                <div className="store-name">👤 {user}</div>
                <div className="store-meta">{info.count} ticket{info.count!==1?"s":""}</div>
                <div className="store-bar-wrap"><div className="store-bar-fill" style={{width:`${(info.total/maxFamTotal)*100}%`,background:"linear-gradient(90deg,#00B8FF,#7C3AED)"}}/></div>
              </div>
              <span className="tv" style={{marginLeft:16,flexShrink:0}}>{fmt(info.total)}</span>
            </div>
          ))}
        </div>
      </>)}

      <div className="sec-label">Actividad de compra (52 semanas)</div>
      <div style={{overflowX:"auto",marginBottom:22,paddingBottom:4}}>
        <div style={{display:"flex",gap:2,minWidth:"max-content"}}>
          {heatmapWeeks.map((week,wi)=>(
            <div key={wi} style={{display:"flex",flexDirection:"column",gap:2}}>
              {week.map((day,di)=>(
                <div key={di} title={day.spend?`${day.k}: ${fmt(day.spend)}`:day.k}
                  onClick={()=>{
                    if(!day.spend)return;
                    const t=historial.find(t=>{const d=parseTicketDate(t.fecha_compra);return d&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`===day.k;});
                    if(t)onOpenTicket(t);
                  }}
                  style={{width:12,height:12,borderRadius:2,background:getCellColor(day.spend),cursor:day.spend?"pointer":"default"}}/>
              ))}
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:5}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#2D3748"}}>Menos</span>
          {[0,.25,.5,.75,1].map((v,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:v===0?"rgba(30,42,58,.4)":`rgba(0,229,160,${0.12+v*0.88})`}}/>)}
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#2D3748"}}>Más</span>
        </div>
      </div>

      {/* Insights automáticos */}
      {(() => {
        const DIAS=["domingos","lunes","martes","miércoles","jueves","viernes","sábados"];
        const daySpend=Array(7).fill(0),dayCount=Array(7).fill(0);
        historial.forEach(t=>{const d=parseTicketDate(t.fecha_compra);if(!d)return;daySpend[d.getDay()]+=(t.total||0);dayCount[d.getDay()]++;});
        const avgByDay=daySpend.map((s,i)=>dayCount[i]?s/dayCount[i]:0);
        const validDays=avgByDay.map((v,i)=>({v,i})).filter(x=>dayCount[x.i]>=2);
        if(validDays.length<2)return null;
        const best=validDays.reduce((m,x)=>x.v<m.v?x:m);
        const worst=validDays.reduce((m,x)=>x.v>m.v?x:m);
        const storeAvgs=Object.entries(storeMap).filter(([,v])=>v.count>=2).map(([k,v])=>({k,avg:v.total/v.count}));
        const cheapest=storeAvgs.reduce((m,s)=>s.avg<m.avg?s:m,storeAvgs[0]);
        const insights=[];
        if(best&&worst&&best.i!==worst.i){insights.push({icon:"📅",txt:`Gastas menos los ${DIAS[best.i]} (${fmt(best.v)} avg) y más los ${DIAS[worst.i]} (${fmt(worst.v)} avg)`});}
        if(cheapest)insights.push({icon:"🏷️",txt:`Ticket medio más bajo en ${cheapest.k}: ${fmt(cheapest.avg)} por visita`});
        const last30=historial.filter(t=>{const d=parseTicketDate(t.fecha_compra);return d&&(Date.now()-d.getTime())<30*864e5;});
        const last30total=last30.reduce((s,t)=>s+(t.total||0),0);
        if(last30.length>1)insights.push({icon:"📊",txt:`Últimos 30 días: ${fmt(last30total)} en ${last30.length} tickets`});
        if(!insights.length)return null;
        return (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div className="sec-label" style={{margin:0,flex:1}}>Insights</div>
            <button onClick={onYearReview} style={{background:"rgba(0,229,160,.08)",border:"1px solid rgba(0,229,160,.2)",color:"#00E5A0",borderRadius:8,padding:"4px 12px",fontFamily:"'Space Mono',monospace",fontSize:10,cursor:"pointer",flexShrink:0,marginLeft:8}}>
              📅 {now.getFullYear()} en revisión
            </button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
            {insights.map((ins,i)=>(
              <div key={i} style={{background:"rgba(0,229,160,.04)",border:"1px solid rgba(0,229,160,.12)",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ins.icon}</span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#6B7280",lineHeight:1.5}}>{ins.txt}</span>
              </div>
            ))}
          </div>
        </>);
      })()}

      <div className="sec-label">Resumen</div>
      <div className="dash-grid">
        <div className="dash-card"><div className="dash-label">Total gastado</div><div className="dash-val" style={{color:"#00E5A0"}}>{fmt(totalGastado)}</div><div className="dash-sub">{historial.length} tickets</div></div>
        <div className="dash-card"><div className="dash-label">Ticket medio</div><div className="dash-val">{fmt(avg)}</div><div className="dash-sub">por visita</div></div>
        <div className="dash-card"><div className="dash-label">Tiendas</div><div className="dash-val">{stores.length}</div></div>
        <div className="dash-card"><div className="dash-label">Mayor compra</div><div className="dash-val" style={{color:"#00E5A0"}}>{fmt(maxTicket.total)}</div><div className="dash-sub">{maxTicket.tienda||"Ticket #"+maxTicket.id}</div></div>
      </div>
      <div className="sec-label">Por tienda</div>
      <div className="totals-block">
        {stores.map(([name,info])=>(
          <div key={name} className="store-row">
            <div style={{flex:1,minWidth:0}}>
              <div className="store-name">{name}</div>
              <div className="store-meta">{info.count} ticket{info.count!==1?"s":""}</div>
              <div className="store-bar-wrap"><div className="store-bar-fill" style={{width:`${(info.total/maxStoreTotal)*100}%`}}/></div>
            </div>
            <span className="tv" style={{marginLeft:16,flexShrink:0}}>{fmt(info.total)}</span>
          </div>
        ))}
      </div>
      <div className="sec-label">Recientes</div>
      <div className="totals-block">
        {historial.slice(0,5).map(t=>(
          <div key={t.id} className="store-row" onClick={()=>onOpenTicket(t)}>
            <div style={{flex:1,minWidth:0}}><div className="store-name">{t.tienda||"Ticket #"+t.id}</div><div className="store-meta">{t.fecha_compra||t.fecha_escaneo?.slice(0,10)}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span className="tv" style={{color:"#00E5A0"}}>{fmt(t.total)}</span><span style={{color:"#4A5568",fontSize:12}}>→</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ticket Detail ─────────────────────────────────────────────────────────────
function TicketDetail({ ticket, onBack, onRefresh, navList = [], onNavigate, tagColors={}, onTagColorChange }) {
  const [showEdit, setShowEdit] = useState(false);
  const [data, setData] = useState(ticket);
  const [shareToast, setShareToast] = useState(false);
  const [deducible, setDeducible] = useState(!!ticket.deducible);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeId, setMergeId] = useState("");
  const [merging, setMerging] = useState(false);
  const touchStartX = useRef(null);
  const navIdx = navList.findIndex(t => t.id === ticket.id);
  const prevNav = navIdx > 0 ? navList[navIdx - 1] : null;
  const nextNav = navIdx >= 0 && navIdx < navList.length - 1 ? navList[navIdx + 1] : null;
  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = e => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && nextNav) onNavigate?.(nextNav);
    if (dx > 0 && prevNav) onNavigate?.(prevNav);
  };

  const refresh = async () => {
    const r = await fetch(`${API}/tickets/${ticket.id}`);
    const full = await r.json();
    setData(full); setDeducible(!!full.deducible); onRefresh?.();
  };

  const merged = {
    ...(data.datos_json ? (() => { try { return JSON.parse(data.datos_json); } catch { return {}; } })() : {}),
    ...data,
    // DB columns always win over datos_json OCR keys
    fecha: data.fecha_compra,
    fecha_compra: data.fecha_compra,
    tienda: data.tienda,
    total: data.total,
    subtotal: data.subtotal,
    descuentos: data.descuentos,
    iva: data.iva,
    hora: data.hora,
    ticket_num: data.ticket_num,
    metodo_pago: data.metodo_pago,
    notas: data.notas,
    productos: data.productos?.length ? data.productos : [],
    tags: data.tags || [],
  };

  const exportJSON = () => { const b=new Blob([JSON.stringify(merged,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`ticket_${ticket.id}.json`; a.click(); };
  const exportCSV = () => {
    if (!merged.productos?.length) return;
    const rows=merged.productos.map(p=>[`"${p.nombre}"`,p.cantidad,p.precio_unitario??"",p.precio_total??""].join(","));
    const b=new Blob(["﻿"+"Producto,Cantidad,P.Unitario,Total\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`ticket_${ticket.id}.csv`; a.click();
  };
  const exportXLSX = () => {
    if (!merged.productos?.length) return;
    const ws=XLSX.utils.json_to_sheet(merged.productos.map(p=>({Producto:p.nombre,Cantidad:p.cantidad,"P.Unitario":p.precio_unitario,Total:p.precio_total,Categoría:p.categoria})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Productos");
    XLSX.writeFile(wb,`ticket_${ticket.id}_${data.tienda||""}.xlsx`);
  };
  const share = async () => {
    const r = await fetch(`${API}/share/${ticket.id}`, { method:"POST" });
    const { token } = await r.json();
    const url = `${window.location.origin}/s/${token}`;
    try { await navigator.clipboard.writeText(url); } catch { prompt("Copia este enlace:", url); }
    setShareToast(true); setTimeout(() => setShareToast(false), 3000);
  };
  const toggleDeducible = async () => {
    const next = !deducible; setDeducible(next);
    await fetch(`${API}/tickets/${ticket.id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...merged, deducible: next })
    });
    onRefresh?.();
  };
  const removeTag = async (tag) => {
    await fetch(`${API}/tickets/${ticket.id}/tags/${encodeURIComponent(tag)}`, { method:"DELETE" });
    refresh();
  };

  const doMerge = async () => {
    const tid = parseInt(mergeId);
    if (!tid || tid === ticket.id) return;
    if (!confirm(`¿Fusionar ticket #${tid} en este? El #${tid} se moverá a la papelera.`)) return;
    setMerging(true);
    try {
      const r = await fetch(`${API}/tickets/${ticket.id}/merge`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ withId: tid })
      });
      if (r.ok) { setShowMerge(false); setMergeId(""); refresh(); onRefresh?.(); }
      else { const e=await r.json(); alert("Error: "+e.error); }
    } catch(e) { alert(e.message); } finally { setMerging(false); }
  };

  const header = (
    <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <button className="btn btn-ghost" onClick={onBack}>← Volver</button>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568"}}>
        #{ticket.id} · {data.fecha_escaneo?.slice(0,16).replace("T"," ")}
      </span>
      {data.subido_por && (
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,background:"rgba(0,229,160,.08)",color:"#00E5A0",border:"1px solid rgba(0,229,160,.2)",borderRadius:20,padding:"2px 9px"}}>
          👤 {data.subido_por}
        </span>
      )}
      <div style={{marginLeft:"auto",display:"flex",gap:6,flexWrap:"wrap"}}>
        <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={share}>🔗 Compartir</button>
        <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:12,color:deducible?"#00E5A0":"#6B7280",borderColor:deducible?"rgba(0,229,160,.3)":"#1E2A3A"}} onClick={toggleDeducible}>
          {deducible?"✓ Deducible":"Deducible"}
        </button>
        <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setShowMerge(v=>!v)}>🔀 Fusionar</button>
        <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setShowEdit(true)}>✏️ Editar</button>
      </div>
    </div>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {showMerge && (
        <div style={{background:"rgba(0,184,255,.04)",border:"1px solid rgba(0,184,255,.15)",borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#00B8FF"}}>🔀 Fusionar con ticket ID:</span>
          <input type="number" placeholder="ID…" value={mergeId} onChange={e=>setMergeId(e.target.value)}
            style={{background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:6,padding:"6px 10px",color:"#E8EDF5",fontSize:12,outline:"none",width:90}}
            onKeyDown={e=>e.key==="Enter"&&doMerge()} autoFocus/>
          <button className="btn btn-primary" style={{padding:"6px 14px",fontSize:12}} onClick={doMerge} disabled={merging}>{merging?"Fusionando…":"Fusionar"}</button>
          <button className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}} onClick={()=>{setShowMerge(false);setMergeId("");}}>Cancelar</button>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",width:"100%"}}>Los productos del ticket indicado se mueven aquí y ese ticket va a la papelera.</span>
        </div>
      )}
      <TicketContent data={merged} ticketId={ticket.id} header={header}
        onExportJSON={exportJSON} onExportCSV={exportCSV} onExportXLSX={exportXLSX}
        onTagAdd={refresh} onTagRemove={removeTag} tagColors={tagColors} onTagColorChange={onTagColorChange}/>
      {navList.length > 1 && (
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",marginTop:4,fontFamily:"'Space Mono',monospace",fontSize:9,color:"#2D3748",borderTop:"1px solid rgba(30,42,58,.4)"}}>
          <span style={{cursor:prevNav?"pointer":"default",color:prevNav?"#4A5568":"#1E2A3A"}} onClick={()=>prevNav&&onNavigate?.(prevNav)}>
            {prevNav?`← ${(prevNav.tienda||"#"+prevNav.id).slice(0,18)}`:""}
          </span>
          <span style={{fontSize:8}}>← desliza →</span>
          <span style={{cursor:nextNav?"pointer":"default",color:nextNav?"#4A5568":"#1E2A3A",textAlign:"right"}} onClick={()=>nextNav&&onNavigate?.(nextNav)}>
            {nextNav?`${(nextNav.tienda||"#"+nextNav.id).slice(0,18)} →`:""}
          </span>
        </div>
      )}
      {showEdit && <EditModal ticket={data} onClose={()=>setShowEdit(false)} onSaved={refresh}/>}
      {shareToast && <div className="share-toast">🔗 Enlace copiado — válido 7 días</div>}
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
// ── Year in Review Modal ──────────────────────────────────────────────────────
function YearReviewModal({ historial, onClose }) {
  const now = new Date(); const y = now.getFullYear();
  const yearTickets = historial.filter(t=>{ const d=parseTicketDate(t.fecha_compra); return d&&d.getFullYear()===y; });
  const totalY = yearTickets.reduce((s,t)=>s+(t.total||0),0);
  const avgY = yearTickets.length?totalY/yearTickets.length:0;
  const storeMap={};yearTickets.forEach(t=>{const k=t.tienda||"Desconocida";if(!storeMap[k])storeMap[k]=0;storeMap[k]+=t.total||0;});
  const topStore=Object.entries(storeMap).sort((a,b)=>b[1]-a[1])[0];
  const monthMap={};
  yearTickets.forEach(t=>{const d=parseTicketDate(t.fecha_compra);if(!d)return;const k=d.getMonth();if(!monthMap[k])monthMap[k]=0;monthMap[k]+=t.total||0;});
  const MESES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const months=Array.from({length:12},(_,i)=>({m:MESES[i],v:monthMap[i]||0}));
  const maxM=Math.max(...months.map(m=>m.v),0.01);
  const peakMonth=months.reduce((best,m)=>m.v>best.v?m:best,months[0]);
  const bigTicket=yearTickets.reduce((m,t)=>(t.total||0)>(m.total||0)?t:m,yearTickets[0]||{});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:20,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",padding:28,animation:"fadeUp .3s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#00E5A0",letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Tu año en números</div>
            <div style={{fontSize:22,fontWeight:800}}>{y} en revisión 🎉</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#4A5568",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[["Total gastado",fmt(totalY),"#00E5A0"],["Tickets",yearTickets.length,"#E8EDF5"],["Ticket medio",fmt(avgY),"#E8EDF5"],["Tiendas",Object.keys(storeMap).length,"#E8EDF5"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        {topStore&&<div style={{background:"rgba(0,229,160,.06)",border:"1px solid rgba(0,229,160,.2)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontFamily:"'Space Mono',monospace",fontSize:12}}>🏆 Tienda favorita: <span style={{color:"#00E5A0",fontWeight:700}}>{topStore[0]}</span> — {fmt(topStore[1])}</div>}
        {peakMonth.v>0&&<div style={{background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.2)",borderRadius:12,padding:"12px 16px",marginBottom:16,fontFamily:"'Space Mono',monospace",fontSize:12}}>📈 Mes más caro: <span style={{color:"#FCD34D",fontWeight:700}}>{peakMonth.m}</span> — {fmt(peakMonth.v)}</div>}
        {bigTicket.id&&<div style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",borderRadius:12,padding:"12px 16px",marginBottom:20,fontFamily:"'Space Mono',monospace",fontSize:12}}>💸 Compra más grande: <span style={{color:"#F87171",fontWeight:700}}>{fmt(bigTicket.total)}</span> en {bigTicket.tienda||"ticket #"+bigTicket.id}</div>}
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Gasto mensual {y}</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80,marginBottom:8}}>
          {months.map((m,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:"100%",borderRadius:"3px 3px 0 0",background:m.v===peakMonth.v?"#00E5A0":"rgba(0,229,160,.35)",minHeight:m.v?2:0,height:`${(m.v/maxM)*70}px`,transition:"height .3s"}}/>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:7,color:"#4A5568"}}>{m.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generateMonthlyReport(historial) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const tickets = historial.filter(t => {
    const d = parseTicketDate(t.fecha_compra);
    return d && d.getFullYear()===y && d.getMonth()===m;
  });
  const total = tickets.reduce((s,t)=>s+(t.total||0),0);
  const storeMap = {};
  tickets.forEach(t=>{ const k=t.tienda||"Desconocida"; if(!storeMap[k])storeMap[k]={n:0,total:0}; storeMap[k].n++; storeMap[k].total+=t.total||0; });
  const stores = Object.entries(storeMap).sort((a,b)=>b[1].total-a[1].total);
  const fmtE = v => v!=null?parseFloat(v).toFixed(2)+"€":"—";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe ${MESES_ES[m]} ${y}</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111}h1{color:#059669;border-bottom:2px solid #059669;padding-bottom:8px}h2{color:#374151;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-top:28px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px}td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.total-row td{font-weight:700;color:#059669;border-top:2px solid #059669}.badge{display:inline-block;background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:20px;font-size:11px;font-family:monospace}@media print{body{margin:20px}}</style>
  </head><body>
  <h1>📊 Informe de gasto — ${MESES_ES[m]} ${y}</h1>
  <p style="color:#6b7280;font-size:13px">Generado el ${now.toLocaleDateString("es-ES")} · TicketScan</p>
  <h2>Resumen</h2>
  <table><tr><th>Total gastado</th><th>Tickets</th><th>Ticket medio</th></tr>
  <tr><td class="badge">${fmtE(total)}</td><td>${tickets.length}</td><td>${tickets.length?fmtE(total/tickets.length):"—"}</td></tr></table>
  <h2>Por tienda</h2>
  <table><tr><th>Tienda</th><th>Visitas</th><th>Total</th><th>Medio</th></tr>
  ${stores.map(([s,v])=>`<tr><td><b>${s}</b></td><td>${v.n}</td><td>${fmtE(v.total)}</td><td>${fmtE(v.total/v.n)}</td></tr>`).join("")}
  <tr class="total-row"><td>TOTAL</td><td>${tickets.length}</td><td>${fmtE(total)}</td><td></td></tr></table>
  <h2>Tickets del mes</h2>
  <table><tr><th>#</th><th>Tienda</th><th>Fecha</th><th>Total</th></tr>
  ${tickets.map(t=>`<tr><td>#${t.id}</td><td>${t.tienda||"—"}</td><td>${t.fecha_compra||"—"}</td><td>${fmtE(t.total)}</td></tr>`).join("")}
  </table></body></html>`;
  const win = window.open("","_blank");
  if (!win) { alert("Permite ventanas emergentes para generar el informe."); return; }
  win.document.write(html); win.document.close();
  setTimeout(()=>win.print(), 400);
}

function Settings({ historial, theme, onThemeToggle, pwaPrompt }) {
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [autoRules, setAutoRules] = useState(() => { try { return JSON.parse(localStorage.getItem("ts_autotag_rules")||"[]"); } catch { return []; } });
  const [newRuleField, setNewRuleField] = useState("tienda");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleTag, setNewRuleTag] = useState("");
  const addAutoRule = () => {
    if (!newRuleValue.trim()||!newRuleTag.trim()) return;
    const next=[...autoRules,{field:newRuleField,value:newRuleValue.trim(),tag:newRuleTag.trim()}];
    setAutoRules(next); localStorage.setItem("ts_autotag_rules",JSON.stringify(next));
    setNewRuleValue(""); setNewRuleTag("");
  };
  const delAutoRule = (i) => {
    const next=autoRules.filter((_,j)=>j!==i);
    setAutoRules(next); localStorage.setItem("ts_autotag_rules",JSON.stringify(next));
  };
  const [ivaReport, setIvaReport] = useState(null);
  const [ivaYear, setIvaYear] = useState(new Date().getFullYear());
  const [ivaQ, setIvaQ] = useState(Math.ceil((new Date().getMonth()+1)/3));
  const [customCats, setCustomCats] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newCatKws, setNewCatKws] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    fetch(`${API}/custom-categories`).then(r=>r.json()).then(d=>setCustomCats(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);

  const backup = () => window.open(`${API}/backup`, "_blank");
  const restore = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImporting(true); setMsg(null);
    try {
      const data = JSON.parse(await f.text());
      const r = await fetch(`${API}/restore`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
      const res = await r.json();
      setMsg(r.ok ? `✅ Importados ${res.imported} tickets` : `❌ ${res.error}`);
    } catch (err) { setMsg(`❌ ${err.message}`); } finally { setImporting(false); }
  };

  const exportAllXLSX = () => {
    const ws=XLSX.utils.json_to_sheet(historial.map(t=>({ID:t.id,Tienda:t.tienda,Fecha:t.fecha_compra,Hora:t.hora,"Nº Ticket":t.ticket_num,"Método pago":t.metodo_pago,Subtotal:t.subtotal,Descuentos:t.descuentos,IVA:t.iva,Total:t.total,Deducible:t.deducible?1:0})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Tickets");
    XLSX.writeFile(wb,`ticketscan_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportYNAB = () => {
    const rows = historial.map(t => {
      const [d,m,y] = (t.fecha_compra||"").split("/")||[];
      const date = d&&m&&y ? `${m}/${d}/${y}` : t.fecha_escaneo?.slice(0,10)||"";
      return [date, t.tienda||"Compra", "Alimentación", `Ticket #${t.id}`, (t.total||0).toFixed(2), ""].join(",");
    });
    const csv = "Date,Payee,Category,Memo,Outflow,Inflow\n" + rows.join("\n");
    const b=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="ticketscan-ynab.csv"; a.click();
  };

  const copyForSheets = () => {
    const rows = [["ID","Tienda","Fecha","Total","IVA","Método pago","Tickets"]];
    historial.forEach(t => rows.push([t.id,t.tienda,t.fecha_compra,t.total,t.iva,t.metodo_pago,1]));
    const tsv = rows.map(r=>r.join("\t")).join("\n");
    navigator.clipboard.writeText(tsv).then(()=>alert("✅ Copiado al portapapeles — pega en Google Sheets con Ctrl+V")).catch(()=>{});
  };

  const loadIVA = async () => {
    const r = await fetch(`${API}/iva-report?year=${ivaYear}&quarter=${ivaQ}`);
    setIvaReport(await r.json());
  };

  const addCustomCat = async () => {
    if (!newCatName.trim()) return;
    await fetch(`${API}/custom-categories`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nombre:newCatName.trim(), icono:newCatIcon||"📦", keywords:newCatKws })
    });
    setNewCatName(""); setNewCatIcon("📦"); setNewCatKws("");
    const r = await fetch(`${API}/custom-categories`); setCustomCats(await r.json());
  };
  const deleteCustomCat = async (nombre) => {
    await fetch(`${API}/custom-categories/${encodeURIComponent(nombre)}`, { method:"DELETE" });
    setCustomCats(prev => prev.filter(c=>c.nombre!==nombre));
  };

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <div className="settings-section">
        <div className="settings-title">🎨 Apariencia</div>
        <div className="settings-row">
          <div><div className="settings-lbl">Tema</div><div className="settings-desc">Cambia entre modo oscuro y claro</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={onThemeToggle}>
            {theme==="light" ? "🌙 Modo oscuro" : "☀️ Modo claro"}
          </button>
        </div>
        {pwaPrompt && (
          <div className="settings-row">
            <div><div className="settings-lbl">Instalar app</div><div className="settings-desc">Añade TicketScan a la pantalla de inicio</div></div>
            <button className="btn btn-primary" style={{fontSize:12,padding:"7px 14px"}} onClick={async()=>{
              pwaPrompt.prompt();
              const {outcome}=await pwaPrompt.userChoice;
              if(outcome==="accepted") alert("✅ App instalada correctamente");
            }}>📲 Instalar</button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-title">💾 Backup y datos</div>
        <div className="settings-row">
          <div><div className="settings-lbl">Exportar backup</div><div className="settings-desc">Descarga todos los tickets en JSON</div></div>
          <button className="btn btn-primary" style={{fontSize:12,padding:"7px 14px"}} onClick={backup}>Descargar</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">Importar backup</div><div className="settings-desc">Restaura desde archivo JSON</div></div>
          <div>
            <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={restore}/>
            <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>fileRef.current?.click()} disabled={importing}>
              {importing?"Importando…":"Importar"}
            </button>
          </div>
        </div>
        {msg && <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,marginTop:10,color:msg.startsWith("✅")?"#34D399":"#F87171"}}>{msg}</div>}
      </div>

      <div className="settings-section">
        <div className="settings-title">📊 Exportar</div>
        <div className="settings-row">
          <div><div className="settings-lbl">Excel completo</div><div className="settings-desc">{historial.length} tickets en .xlsx</div></div>
          <button className="btn btn-primary" style={{fontSize:12,padding:"7px 14px"}} onClick={exportAllXLSX}>Excel</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">YNAB / Actual Budget</div><div className="settings-desc">Formato CSV compatible para apps de presupuesto</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={exportYNAB}>⬇ YNAB CSV</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">Google Sheets</div><div className="settings-desc">Copia datos al portapapeles — pega en Sheets</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={copyForSheets}>📋 Copiar TSV</button>
        </div>
        <div className="settings-row">
          <div><div className="settings-lbl">Informe mensual PDF</div><div className="settings-desc">Resumen del mes actual — guardar/imprimir como PDF</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>generateMonthlyReport(historial)}>📄 Generar PDF</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">🧾 IVA / Autónomos</div>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",marginBottom:10}}>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginBottom:4}}>AÑO</div>
            <input className="form-inp-sm" type="number" value={ivaYear} onChange={e=>setIvaYear(parseInt(e.target.value))} style={{width:70}}/>
          </div>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginBottom:4}}>TRIMESTRE</div>
            <select className="form-inp-sm" value={ivaQ} onChange={e=>setIvaQ(parseInt(e.target.value))} style={{width:50}}>
              {[1,2,3,4].map(q=><option key={q} value={q}>T{q}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{fontSize:12,padding:"7px 14px"}} onClick={loadIVA}>Calcular</button>
        </div>
        {ivaReport && (
          <div style={{background:"rgba(0,229,160,.04)",border:"1px solid rgba(0,229,160,.15)",borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[["Tickets deducibles",ivaReport.tickets],["Base imponible",fmt(ivaReport.base_imponible)],["IVA soportado",fmt(ivaReport.iva_soportado)]].map(([l,v])=>(
                <div key={l}><div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginBottom:3}}>{l}</div><div style={{fontWeight:700}}>{v}</div></div>
              ))}
            </div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginTop:8}}>
              Marca tickets como "Deducible" desde el detalle de cada ticket.
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-title">🏷️ Categorías personalizadas</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12}}>
          <input className="form-inp-sm" placeholder="Icono" value={newCatIcon} onChange={e=>setNewCatIcon(e.target.value)} style={{width:50}}/>
          <input className="form-inp-sm" placeholder="Nombre categoría…" value={newCatName} onChange={e=>setNewCatName(e.target.value)} style={{flex:1,minWidth:120}}/>
          <input className="form-inp-sm" placeholder="palabras,clave,separadas,por,coma" value={newCatKws} onChange={e=>setNewCatKws(e.target.value)} style={{flex:2,minWidth:160}}/>
          <button className="btn btn-primary" style={{fontSize:12,padding:"7px 14px"}} onClick={addCustomCat}>Añadir</button>
        </div>
        {customCats.length > 0 && customCats.map(c=>(
          <div key={c.nombre} className="custom-cat-row">
            <span style={{fontSize:18}}>{c.icono}</span>
            <span style={{flex:1,fontWeight:600,fontSize:13}}>{c.nombre}</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",flex:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.keywords}</span>
            <button onClick={()=>deleteCustomCat(c.nombre)} style={{background:"none",border:"none",color:"#2D3748",cursor:"pointer",fontSize:13,padding:"2px 6px",transition:"color .15s"}} onMouseEnter={e=>e.target.style.color="#EF4444"} onMouseLeave={e=>e.target.style.color="#2D3748"}>✕</button>
          </div>
        ))}
        {customCats.length===0 && <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#2D3748"}}>Sin categorías personalizadas todavía.</div>}
      </div>

      <div className="settings-section">
        <div className="settings-title">🏷️ Auto-etiquetado</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",marginBottom:10}}>
          Aplica tags automáticamente al escanear un ticket según condiciones.
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end",marginBottom:10}}>
          <select value={newRuleField} onChange={e=>setNewRuleField(e.target.value)} className="form-inp-sm" style={{width:90}}>
            <option value="tienda">Tienda</option>
            <option value="total_gt">Total &gt;</option>
            <option value="total_lt">Total &lt;</option>
          </select>
          <input className="form-inp-sm" placeholder={newRuleField==="tienda"?"Mercadona…":"Importe…"} value={newRuleValue} onChange={e=>setNewRuleValue(e.target.value)} style={{flex:1,minWidth:90}}/>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568",flexShrink:0}}>→ tag:</span>
          <input className="form-inp-sm" placeholder="supermercado…" value={newRuleTag} onChange={e=>setNewRuleTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAutoRule()} style={{flex:1,minWidth:90}}/>
          <button className="btn btn-primary" style={{fontSize:12,padding:"7px 12px"}} onClick={addAutoRule}>+ Añadir</button>
        </div>
        {autoRules.length>0 ? autoRules.map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(30,42,58,.4)",fontFamily:"'Space Mono',monospace",fontSize:11}}>
            <span style={{color:"#4A5568",flex:1}}>Si <span style={{color:"#00B8FF"}}>{r.field}</span> contiene "<span style={{color:"#E8EDF5"}}>{r.value}</span>" → tag <span style={{color:"#00E5A0"}}>"{r.tag}"</span></span>
            <button onClick={()=>delAutoRule(i)} style={{background:"none",border:"none",color:"#2D3748",cursor:"pointer",fontSize:13,padding:"2px 4px"}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#2D3748"}>✕</button>
          </div>
        )) : <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#2D3748"}}>Sin reglas todavía.</div>}
      </div>

      <div className="settings-section">
        <div className="settings-title">🔔 Notificaciones</div>
        <div className="settings-row">
          <div><div className="settings-lbl">Notificaciones del navegador</div><div className="settings-desc">Aviso automático al terminar análisis</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={async()=>{const p=await Notification.requestPermission();alert(p==="granted"?"✅ Activas":"❌ Permiso denegado");}}>
            {typeof Notification!=="undefined"&&Notification.permission==="granted"?"✅ Activas":"Activar"}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">🏠 Gestión del Hogar</div>
        <div className="settings-row">
          <div>
            <div className="settings-lbl">Volcar tickets históricos</div>
            <div className="settings-desc">Envía todos los tickets ya guardados a la app de gestión del hogar</div>
          </div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px",whiteSpace:"nowrap"}} onClick={async()=>{
            setMsg("⏳ Sincronizando…");
            try {
              const tk = localStorage.getItem("ts_token")||"noauth";
              const r = await fetch(`${API}/firebase-backfill`, { method:"POST", headers:{"Authorization":`Bearer ${tk}`} });
              const d = await r.json();
              if (d.ok) setMsg(`✅ ${d.synced} tickets enviados (${d.skipped} ya existían)`);
              else setMsg(`❌ ${d.error}`);
            } catch(e) { setMsg(`❌ ${e.message}`); }
            setTimeout(()=>setMsg(null), 6000);
          }}>Sincronizar</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">ℹ️ Estado</div>
        <div className="settings-row"><div><div className="settings-lbl">Tickets guardados</div></div><span style={{fontFamily:"'Space Mono',monospace",fontWeight:700,color:"#00E5A0"}}>{historial.length}</span></div>
        <div className="settings-row"><div><div className="settings-lbl">Versión</div></div><span style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568"}}>TicketScan 3.0</span></div>
      </div>
    </div>
  );
}

// ── App Principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [historial, setHistorial] = useState([]);
  const [view, setView] = useState("dash");
  const [selected, setSelected] = useState(null);
  const [backendOK, setBackendOK] = useState(null);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("tienda"); // tienda | producto
  const [fullTextResults, setFullTextResults] = useState(null);
  const [sort, setSort] = useState("newest");
  const [tagFilter, setTagFilter] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("ts_token")||"noauth");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("ts_user")||null);
  const [multiUser, setMultiUser] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loginUser, setLoginUser] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkTag, setBulkTag] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("ts_theme")||"dark");
  const [tagColors, setTagColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ts_tag_colors")||"{}"); } catch { return {}; }
  });
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [undoQueue, setUndoQueue] = useState([]);
  const [showYearReview, setShowYearReview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef();
  const searchDebounce = useRef();

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    let el = document.getElementById("ts-light-css");
    if (theme === "light") {
      if (!el) { el = document.createElement("style"); el.id="ts-light-css"; document.head.appendChild(el); }
      el.textContent = LIGHT_CSS;
    } else { el?.remove(); }
    localStorage.setItem("ts_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t==="dark"?"light":"dark");

  // PWA install prompt
  useEffect(() => {
    const handler = e => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const saveTagColor = useCallback((tag, color) => {
    setTagColors(prev => {
      const next = {...prev, [tag]: color};
      localStorage.setItem("ts_tag_colors", JSON.stringify(next));
      return next;
    });
  }, []);

  // Mini stats sidebar
  const thisMonthTotal = useMemo(() => {
    const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
    return historial.filter(t=>{const d=parseTicketDate(t.fecha_compra);return d&&d.getFullYear()===y&&d.getMonth()===m;}).reduce((s,t)=>s+(t.total||0),0);
  }, [historial]);
  const lastMonthTotal = useMemo(() => {
    const now=new Date(); const m=now.getMonth()-1; const y=m<0?now.getFullYear()-1:now.getFullYear(); const adjM=m<0?11:m;
    return historial.filter(t=>{const d=parseTicketDate(t.fecha_compra);return d&&d.getFullYear()===y&&d.getMonth()===adjM;}).reduce((s,t)=>s+(t.total||0),0);
  }, [historial]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT") return;
      if (e.metaKey||e.ctrlKey) return;
      const map = { d:"dash", a:"analytics", n:"scan", l:"lista", b:"budget", c:"compare", S:"settings" };
      const navMap = { "1":"dash","2":"analytics","3":"scan","4":"lista","5":"budget","6":"compare","7":"settings" };
      if (map[e.key]) { setView(map[e.key]); setSelected(null); }
      else if (navMap[e.key]) { setView(navMap[e.key]); setSelected(null); }
      else if (e.key==="s") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key==="?") setShowShortcuts(v=>!v);
      else if (e.key==="Escape") { setShowShortcuts(false); if (view==="detail") { setView("dash"); setSelected(null); } }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  // Full-text search debounce
  useEffect(() => {
    if (searchMode !== "producto") { setFullTextResults(null); return; }
    clearTimeout(searchDebounce.current);
    if (search.trim().length < 2) { setFullTextResults(null); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/search?q=${encodeURIComponent(search)}`);
        if (r.ok) setFullTextResults(await r.json());
      } catch {}
    }, 350);
  }, [search, searchMode]);

  const authHeaders = useCallback(() => ({ "Content-Type":"application/json", "Authorization":`Bearer ${token}` }), [token]);

  const loadHistorial = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tickets`, { headers:{"Authorization":`Bearer ${token}`} });
      if (r.status===401) { setNeedsAuth(true); return; }
      setHistorial(await r.json()); setBackendOK(true);
    } catch { setBackendOK(false); }
  }, [token]);

  const cancelDelete = useCallback((id) => {
    setUndoQueue(prev => {
      const q=prev.find(q=>q.id===id); if(q)clearTimeout(q.timerId);
      return prev.filter(q=>q.id!==id);
    });
    loadHistorial();
  }, [loadHistorial]);

  const loadTags = useCallback(async () => {
    try { const r=await fetch(`${API}/tags`,{headers:{"Authorization":`Bearer ${token}`}}); if(r.ok) setAllTags(await r.json()); } catch {}
  }, [token]);

  useEffect(() => {
    fetch(`${API}/check`).then(r=>r.json()).then(d => {
      if (d.multiUser) {
        setMultiUser(true);
        const names = d.users || [];
        setUsersList(names);
        if (names.length && !loginUser) setLoginUser(names[0]);
      }
      if (d.needsAuth && !token) setNeedsAuth(true);
      else { setNeedsAuth(false); loadHistorial(); loadTags(); }
    }).catch(()=>{ loadHistorial(); loadTags(); });
  }, [loadHistorial, loadTags, token]);

  // Keep Render.com backend warm (free tier spins down after 15 min inactivity)
  useEffect(() => {
    const ping = () => fetch(`${API}/check`).catch(()=>{});
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Reload when tab regains focus
  useEffect(() => {
    const handler = () => { if (document.visibilityState === "visible") { loadHistorial(); loadTags(); } };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [loadHistorial, loadTags]);

  const login = async () => {
    const body = multiUser ? { password, nombre: loginUser } : { password };
    const r = await fetch(`${API}/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { setAuthError(data.error); return; }
    setToken(data.token); localStorage.setItem("ts_token", data.token);
    if (data.user) { setCurrentUser(data.user); localStorage.setItem("ts_user", data.user); }
    setNeedsAuth(false); loadHistorial(); loadTags();
  };

  const logout = () => {
    setToken("noauth"); setCurrentUser(null);
    localStorage.removeItem("ts_token"); localStorage.removeItem("ts_user");
    setNeedsAuth(true);
  };

  const bulkAddTag = async () => {
    if (!bulkTag.trim() || !selectedIds.size) return;
    await Promise.all([...selectedIds].map(id =>
      fetch(`${API}/tickets/${id}/tags`, { method:"POST", headers:authHeaders(), body:JSON.stringify({tag:bulkTag.trim()}) })
    ));
    setBulkTag(""); setBulkMode(false); setSelectedIds(new Set()); loadHistorial(); loadTags();
  };

  const bulkDeleteSelected = async () => {
    if (!selectedIds.size || !confirm(`¿Mover ${selectedIds.size} ticket${selectedIds.size>1?"s":""} a la papelera?`)) return;
    await Promise.all([...selectedIds].map(id =>
      fetch(`${API}/tickets/${id}`, { method:"DELETE", headers:authHeaders() })
    ));
    setBulkMode(false); setSelectedIds(new Set()); loadHistorial();
    if (view === "detail") { setView("dash"); setSelected(null); }
  };

  const deleteTicket = useCallback((e, id) => {
    e.stopPropagation();
    const nome = historial.find(t=>t.id===id)?.tienda || `#${id}`;
    if (selected?.id===id) { setView("dash"); setSelected(null); }
    setHistorial(prev => prev.filter(t => t.id !== id)); // optimistic
    const timerId = setTimeout(async () => {
      await fetch(`${API}/tickets/${id}`, { method:"DELETE", headers:{"Authorization":`Bearer ${token}`} });
      setUndoQueue(prev => prev.filter(q => q.id !== id));
    }, 5500);
    setUndoQueue(prev => [...prev, { id, nome, timerId }]);
  }, [historial, selected, token]);

  const openDetail = async (ticket) => {
    const r = await fetch(`${API}/tickets/${ticket.id}`, { headers:authHeaders() });
    const full = await r.json();
    setSelected(full); setView("detail");
    setSidebarOpen(false);
    document.querySelector(".main")?.scrollTo(0, 0);
  };

  const displayedTickets = useMemo(() => (
    (searchMode==="producto" && fullTextResults)
      ? fullTextResults
      : historial
          .filter(t => !search || (t.tienda||"").toLowerCase().includes(search.toLowerCase()) ||
            (t.fecha_compra||"").includes(search) || (t.total!=null&&String(t.total).includes(search)))
          .filter(t => !tagFilter || (t.tags||[]).includes(tagFilter))
          .filter(t => {
            if (!dateFrom && !dateTo) return true;
            const d = parseTicketDate(t.fecha_compra); if (!d) return true;
            if (dateFrom && d < new Date(dateFrom+"T00:00:00")) return false;
            if (dateTo && d > new Date(dateTo+"T23:59:59")) return false;
            return true;
          })
          .sort((a,b) => {
            if (sort==="newest") return b.id-a.id;
            if (sort==="oldest") return a.id-b.id;
            if (sort==="highest") return (b.total||0)-(a.total||0);
            if (sort==="lowest") return (a.total||0)-(b.total||0);
            return 0;
          })
  ), [historial, search, searchMode, fullTextResults, tagFilter, dateFrom, dateTo, sort]);

  if (needsAuth) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0A0E1A"}}>
      <style>{css}</style>
      <div style={{background:"#111827",border:"1px solid #1E2A3A",borderRadius:16,padding:32,width:320,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>🔐</div>
        <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Ticket<span style={{color:"#00E5A0"}}>Scan</span></div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4A5568",marginBottom:20}}>
          {multiUser ? "Selecciona tu usuario" : "Introduce la contraseña"}
        </div>
        {multiUser && usersList.length > 0 && (
          <select value={loginUser} onChange={e=>setLoginUser(e.target.value)}
            style={{width:"100%",background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:8,padding:"12px 14px",color:"#E8EDF5",fontSize:14,outline:"none",marginBottom:10,fontFamily:"'Syne',sans-serif",cursor:"pointer"}}>
            {usersList.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <input type="password" style={{width:"100%",background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:8,padding:"12px 14px",color:"#E8EDF5",fontSize:14,outline:"none",marginBottom:10}}
          placeholder="Contraseña…" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} autoFocus/>
        {authError && <div style={{color:"#F87171",fontFamily:"'Space Mono',monospace",fontSize:11,marginBottom:10}}>{authError}</div>}
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={login}>Entrar</button>
      </div>
    </div>
  );

  const navItems = [
    ["dash","📊 Dashboard"],["analytics","📈 Análisis"],["advanced","🔬 Avanzado"],
    ["scan","📷 Escanear"],["lista","🛒 Lista"],["budget","💶 Presupuesto"],
    ["compare","🔍 Comparar"],["chat","🤖 Chat"],["alerts","🔔 Alertas"],["trash","🗑️ Papelera"],["settings","⚙️ Ajustes"]
  ];

  return (
    <div className="app" data-theme={theme}>
      <style>{css}</style>
      <div className="grid-bg"/>

      {showShortcuts && <ShortcutsOverlay onClose={()=>setShowShortcuts(false)}/>}

      {sidebarOpen && <div className="sidebar-backdrop" onClick={()=>setSidebarOpen(false)}/>}

      <aside className={`sidebar${sidebarOpen?" sidebar-open":""}`}>
        <div className="sidebar-header">
          <div className="logo" style={{flex:1}}>
            <div className="logo-icon">🧾</div>
            <div>
              <div className="logo-text">Ticket<span>Scan</span></div>
              <div className="logo-sub">Escáner inteligente</div>
            </div>
          </div>
          <button className="sidebar-close-mobile" onClick={()=>setSidebarOpen(false)}>✕</button>
        </div>

        {backendOK===false && (
          <div style={{margin:"8px 12px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#FCA5A5",fontFamily:"'Space Mono',monospace",lineHeight:1.5}}>
            ⚠️ Backend no disponible.
          </div>
        )}

        <div className="sidebar-title">
          Historial <span className="ticket-count">{historial.length}</span>
          <button onClick={()=>{setBulkMode(v=>!v);setSelectedIds(new Set());}}
            style={{background:"none",border:"1px solid #1E2A3A",color:bulkMode?"#00E5A0":"#4A5568",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:8,padding:"2px 7px",borderRadius:4,transition:"all .15s",marginLeft:"auto"}}>
            {bulkMode?"✕ cancelar":"☑ sel."}
          </button>
        </div>

        <div className="sidebar-search">
          <div className="search-inp-wrap">
            <span className="search-inp-icon">🔍</span>
            <input ref={searchRef} className="search-inp" list="search-suggestions"
              placeholder={searchMode==="producto"?"Buscar producto en tickets…":"Buscar tienda, fecha, importe…"}
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <datalist id="search-suggestions">
              {searchMode==="tienda" && [...new Set(historial.map(t=>t.tienda).filter(Boolean))].map(s=><option key={s} value={s}/>)}
            </datalist>
          </div>
        </div>

        <div className="search-mode-row">
          <button className={`sm-btn ${searchMode==="tienda"?"active":""}`} onClick={()=>{setSearchMode("tienda");setFullTextResults(null);}}>🏪 Tienda</button>
          <button className={`sm-btn ${searchMode==="producto"?"active":""}`} onClick={()=>setSearchMode("producto")}>🛒 Producto</button>
        </div>

        {allTags.length>0 && (
          <div className="tag-filter">
            <span className={`tag-chip ${!tagFilter?"active":""}`} onClick={()=>setTagFilter(null)}>Todos</span>
            {allTags.map(tag=>{
              const c=tagColors[tag]; const isA=tagFilter===tag;
              return <span key={tag} className={`tag-chip ${isA?"active":""}`}
                style={c&&isA?{borderColor:`${c}55`,color:c,background:`${c}11`}:c?{borderColor:`${c}33`,color:`${c}cc`}:{}}
                onClick={()=>setTagFilter(tagFilter===tag?null:tag)}>{tag}</span>;
            })}
          </div>
        )}

        <div className="sort-row">
          {[["newest","↓ Fecha"],["oldest","↑ Fecha"],["highest","↓ €"],["lowest","↑ €"]].map(([v,label])=>(
            <button key={v} className={`sort-btn ${sort===v?"active":""}`} onClick={()=>setSort(v)}>{label}</button>
          ))}
        </div>
        <div style={{padding:"4px 12px 6px",display:"flex",gap:4,alignItems:"center"}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{flex:1,background:"#111827",border:"1px solid #1E2A3A",borderRadius:6,padding:"5px 6px",color:dateFrom?"#E8EDF5":"#4A5568",fontSize:11,fontFamily:"'Space Mono',monospace",colorScheme:"dark",outline:"none"}}
            title="Desde"/>
          <span style={{color:"#2D3748",fontSize:10,flexShrink:0}}>—</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{flex:1,background:"#111827",border:"1px solid #1E2A3A",borderRadius:6,padding:"5px 6px",color:dateTo?"#E8EDF5":"#4A5568",fontSize:11,fontFamily:"'Space Mono',monospace",colorScheme:"dark",outline:"none"}}
            title="Hasta"/>
          {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom("");setDateTo("");}}
            style={{background:"none",border:"none",color:"#4A5568",cursor:"pointer",fontSize:12,padding:"2px 4px",flexShrink:0}}>✕</button>}
        </div>

        {bulkMode && selectedIds.size > 0 && (
          <div style={{padding:"8px 10px",margin:"0 8px 4px",background:"rgba(0,229,160,.04)",border:"1px solid rgba(0,229,160,.15)",borderRadius:8}}>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#00E5A0",marginBottom:6}}>{selectedIds.size} seleccionado{selectedIds.size>1?"s":""}</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <input value={bulkTag} onChange={e=>setBulkTag(e.target.value)} placeholder="Añadir tag…"
                onKeyDown={e=>e.key==="Enter"&&bulkAddTag()}
                style={{flex:1,background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:5,padding:"5px 8px",color:"#E8EDF5",fontSize:11,fontFamily:"'Space Mono',monospace",outline:"none"}}/>
              <button onClick={bulkAddTag} style={{background:"#00E5A0",border:"none",color:"#0A0E1A",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+Tag</button>
              <button onClick={bulkDeleteSelected} style={{background:"none",border:"1px solid rgba(239,68,68,.25)",color:"#F87171",borderRadius:5,padding:"5px 8px",fontSize:11,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        )}

        {historial.length>0 && (
          <div style={{padding:"6px 14px 8px",borderBottom:"1px solid #1E2A3A",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#4A5568",letterSpacing:1.5,textTransform:"uppercase"}}>Este mes</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:"#00E5A0"}}>{fmt(thisMonthTotal)}</span>
            </div>
            {lastMonthTotal>0 && (()=>{const p=Math.round(((thisMonthTotal-lastMonthTotal)/lastMonthTotal)*100);return <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:p>15?"#F87171":p<-5?"#34D399":"#4A5568",textAlign:"right"}}>{p>0?`+${p}%`:`${p}%`} vs mes pasado</div>;})()}
          </div>
        )}

        <div className="hist-list">
          {displayedTickets.length===0 ? (
            <div className="hist-empty">{search||tagFilter?"Sin resultados":"Sin tickets todavía"}</div>
          ) : displayedTickets.map(t=>(
            <div key={t.id}
              className={`hist-item ${(selected?.id===t.id&&!bulkMode)||(bulkMode&&selectedIds.has(t.id))?"active":""}`}
              onClick={()=>{ if(bulkMode){setSelectedIds(prev=>{const n=new Set(prev);n.has(t.id)?n.delete(t.id):n.add(t.id);return n;});}else{openDetail(t);}}}
              onMouseEnter={e=>{ if(!window.matchMedia("(hover:hover)").matches)return; const r=e.currentTarget.getBoundingClientRect(); setTooltip({ticket:t,x:r.right+6,y:Math.min(r.top,window.innerHeight-240)}); }}
              onMouseLeave={()=>setTooltip(null)}>
              <div className="hist-item-top">
                {bulkMode && <div style={{width:14,height:14,border:"1.5px solid",borderColor:selectedIds.has(t.id)?"#00E5A0":"#2D3748",borderRadius:3,background:selectedIds.has(t.id)?"#00E5A0":"transparent",flexShrink:0,marginRight:6,marginTop:2}}/>}
                <div className="hist-store" style={{flex:1}}>{t.tienda||"Ticket #"+t.id}</div>
                {!bulkMode && <button className="del-btn" onClick={e=>deleteTicket(e,t.id)}>✕</button>}
              </div>
              <div className="hist-meta">
                <span className="hist-date">{t.fecha_compra||t.fecha_escaneo?.slice(0,10)}</span>
                {t.total!=null && <span className="hist-total">{fmt(t.total)}</span>}
              </div>
              {t.matching?.length>0 && <div className="hist-match">🛒 {t.matching.map(m=>m.nombre).slice(0,3).join(", ")}</div>}
              {t.tags?.length>0 && <div className="hist-tags">{t.tags.map(tag=>{
                const c=tagColors[tag]; return <span key={tag} className="hist-tag" style={c?{background:`${c}22`,color:c,borderColor:`${c}44`}:{}}>{tag}</span>;
              })}</div>}
              {t.subido_por && <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#6B7280",marginTop:3}}>👤 {t.subido_por}</div>}
            </div>
          ))}
        </div>

        <div style={{padding:"8px 14px",borderTop:"1px solid #1E2A3A",flexShrink:0}}>
          {currentUser && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#4A5568"}}>
                👤 <span style={{color:"#00E5A0"}}>{currentUser}</span>
              </span>
              <button onClick={logout}
                style={{background:"none",border:"1px solid #1E2A3A",color:"#4A5568",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:9,padding:"2px 7px",borderRadius:4,transition:"all .15s"}}
                title="Cerrar sesión"
                onMouseEnter={e=>{e.currentTarget.style.color="#F87171";e.currentTarget.style.borderColor="rgba(239,68,68,.3)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#4A5568";e.currentTarget.style.borderColor="#1E2A3A";}}>
                ↪ salir
              </button>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={toggleTheme} style={{background:"none",border:"none",color:"#4A5568",cursor:"pointer",fontSize:14,padding:"4px"}} title="Cambiar tema">
              {theme==="light"?"🌙":"☀️"}
            </button>
            <button onClick={()=>setShowShortcuts(true)} style={{background:"none",border:"none",color:"#4A5568",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:10,padding:"4px"}} title="Atajos de teclado">
              ⌨️ ?
            </button>
          </div>
        </div>
      </aside>

      {view!=="scan" && (
        <button className="fab" onClick={()=>{setView("scan");setSelected(null);}} title="Escanear ticket">📷</button>
      )}

      <main className="main">
        <div className="main-inner">
          {view!=="detail" && view!=="scan" && (
            <button className="mobile-historial-btn" onClick={()=>setSidebarOpen(true)}>
              🧾 Historial <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,background:"rgba(0,229,160,.15)",color:"#00E5A0",borderRadius:20,padding:"1px 7px",marginLeft:4}}>{displayedTickets.length}</span>
              <span style={{marginLeft:"auto",color:"#4A5568"}}>→</span>
            </button>
          )}
          {view!=="detail" && (
            <div className="main-nav">
              {navItems.map(([v,l])=>(
                <button key={v} className={`nav-tab ${view===v?"active":""}`} onClick={()=>{setView(v);setSelected(null);}}>{l}</button>
              ))}
            </div>
          )}

          {view==="detail"&&selected
            ? <TicketDetail key={selected.id} ticket={selected} onBack={()=>{setView("dash");setSelected(null);}} onRefresh={()=>{loadHistorial();loadTags();}} navList={displayedTickets} onNavigate={openDetail} tagColors={tagColors} onTagColorChange={saveTagColor}/>
            : view==="scan" ? <ScanPanel onSaved={loadHistorial} historial={historial} currentUser={currentUser}/>
            : view==="analytics" ? <Analytics historial={historial}/>
            : view==="advanced" ? <AdvancedAnalysis historial={historial}/>
            : view==="lista" ? <ShoppingList/>
            : view==="budget" ? <Budget/>
            : view==="compare" ? <Compare historial={historial}/>
            : view==="chat" ? <Chat/>
            : view==="alerts" ? <PriceAlerts/>
            : view==="trash" ? <Trash onRestored={loadHistorial}/>
            : view==="settings" ? <Settings historial={historial} theme={theme} onThemeToggle={toggleTheme} pwaPrompt={pwaPrompt}/>
            : <DashboardView historial={historial} onOpenTicket={openDetail} onYearReview={()=>setShowYearReview(true)}/>
          }
        </div>
      </main>

      {tooltip && (
        <div style={{position:"fixed",left:tooltip.x,top:tooltip.y,zIndex:99,background:"#0D1220",border:"1px solid #1E2A3A",borderRadius:10,padding:"12px 14px",minWidth:220,maxWidth:280,pointerEvents:"none",boxShadow:"0 8px 32px rgba(0,0,0,.65)",animation:"fadeUp .12s ease"}}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tooltip.ticket.tienda||"Ticket #"+tooltip.ticket.id}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#4A5568",marginBottom:7}}>{tooltip.ticket.fecha_compra} · {fmt(tooltip.ticket.total)}</div>
          {(() => {
            try {
              const prods = JSON.parse(tooltip.ticket.datos_json||"{}").productos||[];
              if (!prods.length) return <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#2D3748"}}>Sin productos</div>;
              return (<>
                {prods.slice(0,5).map((p,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,padding:"3px 0",borderBottom:i<Math.min(prods.length,5)-1?"1px solid rgba(30,42,58,.4)":"none"}}>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</span>
                    <span style={{fontFamily:"'Space Mono',monospace",color:"#00E5A0",flexShrink:0,fontSize:10}}>{fmt(p.precio_total||p.precio_unitario)}</span>
                  </div>
                ))}
                {prods.length>5 && <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:"#4A5568",marginTop:4}}>+{prods.length-5} más</div>}
              </>);
            } catch { return null; }
          })()}
        </div>
      )}

      {/* Undo toast */}
      {undoQueue.length>0 && (
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:400,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
          {undoQueue.map(q=>(
            <div key={q.id} style={{background:"#1E2A3A",border:"1px solid #2D3748",borderRadius:30,padding:"10px 18px",display:"flex",alignItems:"center",gap:12,fontFamily:"'Space Mono',monospace",fontSize:11,boxShadow:"0 4px 24px rgba(0,0,0,.7)",animation:"fadeUp .2s ease",whiteSpace:"nowrap"}}>
              <span style={{color:"#6B7280"}}>🗑️ <span style={{color:"#E8EDF5"}}>{q.nome}</span> eliminado</span>
              <button onClick={()=>cancelDelete(q.id)} style={{background:"#00E5A0",border:"none",color:"#0A0E1A",borderRadius:20,padding:"4px 14px",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:700,cursor:"pointer"}}>↩️ Deshacer</button>
            </div>
          ))}
        </div>
      )}

      {/* Year in review modal */}
      {showYearReview && <YearReviewModal historial={historial} onClose={()=>setShowYearReview(false)}/>}
    </div>
  );
}
