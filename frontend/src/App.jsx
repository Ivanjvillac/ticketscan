import { useState, useRef, useCallback, useEffect } from "react";
import Analytics from "./Analytics";
import Budget from "./Budget";
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
@media(max-width:680px){
  .app{flex-direction:column}
  .sidebar{width:100%;max-height:260px;height:auto;position:relative}
  .hist-list{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:0 10px 10px;flex-wrap:nowrap}
  .hist-item{min-width:160px;flex-shrink:0}
  .dash-grid{grid-template-columns:1fr 1fr}
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
function TicketContent({ data, ticketId, onExportJSON, onExportCSV, onExportXLSX, extra, header, onTagAdd, onTagRemove }) {
  const [prodSearch, setProdSearch] = useState("");
  const [newTag, setNewTag] = useState("");

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
          <table className="items-table">
            <thead><tr><th>Producto</th><th>Uds</th><th>P. Unit</th><th>Total</th></tr></thead>
            <tbody>
              {filtered.map((p,i) => (
                <tr key={i}>
                  <td className="i-name" style={dups.includes(p.nombre?.toLowerCase().trim())?{color:"#FCD34D"}:{}}>{p.nombre}</td>
                  <td className="i-qty">×{p.cantidad}</td>
                  <td className="i-up">{fmt(p.precio_unitario)}</td>
                  <td className="i-tot">{fmt(p.precio_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
            {(data.tags||[]).map(tag => (
              <span key={tag} className="tick-tag" onClick={()=>onTagRemove?.(tag)} title="Clic para eliminar">{tag} ×</span>
            ))}
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
function DashboardView({ historial, onOpenTicket }) {
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
function TicketDetail({ ticket, onBack, onRefresh }) {
  const [showEdit, setShowEdit] = useState(false);
  const [data, setData] = useState(ticket);
  const [shareToast, setShareToast] = useState(false);
  const [deducible, setDeducible] = useState(!!ticket.deducible);

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
        <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:12}} onClick={()=>setShowEdit(true)}>✏️ Editar</button>
      </div>
    </div>
  );

  return (
    <>
      <TicketContent data={merged} ticketId={ticket.id} header={header}
        onExportJSON={exportJSON} onExportCSV={exportCSV} onExportXLSX={exportXLSX}
        onTagAdd={refresh} onTagRemove={removeTag}/>
      {showEdit && <EditModal ticket={data} onClose={()=>setShowEdit(false)} onSaved={refresh}/>}
      {shareToast && <div className="share-toast">🔗 Enlace copiado — válido 7 días</div>}
    </>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings({ historial, theme, onThemeToggle }) {
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState(null);
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
          <div><div className="settings-lbl">Informe mensual</div><div className="settings-desc">Vista optimizada para imprimir / guardar PDF</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>window.print()}>🖨️ Imprimir</button>
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
        <div className="settings-title">🔔 Notificaciones</div>
        <div className="settings-row">
          <div><div className="settings-lbl">Notificaciones del navegador</div><div className="settings-desc">Aviso automático al terminar análisis</div></div>
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px"}} onClick={async()=>{const p=await Notification.requestPermission();alert(p==="granted"?"✅ Activas":"❌ Permiso denegado");}}>
            {typeof Notification!=="undefined"&&Notification.permission==="granted"?"✅ Activas":"Activar"}
          </button>
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
  const [theme, setTheme] = useState(() => localStorage.getItem("ts_theme")||"dark");
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

  const deleteTicket = async (e, id) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este ticket? Se guardará en la papelera 30 días.")) return;
    await fetch(`${API}/tickets/${id}`, { method:"DELETE", headers:authHeaders() });
    if (selected?.id===id) { setView("dash"); setSelected(null); }
    loadHistorial();
  };

  const openDetail = async (ticket) => {
    const r = await fetch(`${API}/tickets/${ticket.id}`, { headers:authHeaders() });
    const full = await r.json();
    setSelected(full); setView("detail");
  };

  const displayedTickets = (searchMode==="producto" && fullTextResults)
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
        });

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
    ["compare","🔍 Comparar"],["alerts","🔔 Alertas"],["trash","🗑️ Papelera"],["settings","⚙️ Ajustes"]
  ];

  return (
    <div className="app" data-theme={theme}>
      <style>{css}</style>
      <div className="grid-bg"/>

      {showShortcuts && <ShortcutsOverlay onClose={()=>setShowShortcuts(false)}/>}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🧾</div>
            <div>
              <div className="logo-text">Ticket<span>Scan</span></div>
              <div className="logo-sub">Escáner inteligente</div>
            </div>
          </div>
        </div>

        {backendOK===false && (
          <div style={{margin:"8px 12px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#FCA5A5",fontFamily:"'Space Mono',monospace",lineHeight:1.5}}>
            ⚠️ Backend no disponible.
          </div>
        )}

        <div className="sidebar-title">
          Historial <span className="ticket-count">{historial.length}</span>
        </div>

        <div className="sidebar-search">
          <div className="search-inp-wrap">
            <span className="search-inp-icon">🔍</span>
            <input ref={searchRef} className="search-inp" placeholder={searchMode==="producto"?"Buscar producto en tickets…":"Buscar tienda, fecha, importe…"}
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="search-mode-row">
          <button className={`sm-btn ${searchMode==="tienda"?"active":""}`} onClick={()=>{setSearchMode("tienda");setFullTextResults(null);}}>🏪 Tienda</button>
          <button className={`sm-btn ${searchMode==="producto"?"active":""}`} onClick={()=>setSearchMode("producto")}>🛒 Producto</button>
        </div>

        {allTags.length>0 && (
          <div className="tag-filter">
            <span className={`tag-chip ${!tagFilter?"active":""}`} onClick={()=>setTagFilter(null)}>Todos</span>
            {allTags.map(tag=>(
              <span key={tag} className={`tag-chip ${tagFilter===tag?"active":""}`} onClick={()=>setTagFilter(tagFilter===tag?null:tag)}>{tag}</span>
            ))}
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

        <div className="hist-list">
          {displayedTickets.length===0 ? (
            <div className="hist-empty">{search||tagFilter?"Sin resultados":"Sin tickets todavía"}</div>
          ) : displayedTickets.map(t=>(
            <div key={t.id} className={`hist-item ${selected?.id===t.id?"active":""}`} onClick={()=>openDetail(t)}>
              <div className="hist-item-top">
                <div className="hist-store">{t.tienda||"Ticket #"+t.id}</div>
                <button className="del-btn" onClick={e=>deleteTicket(e,t.id)}>✕</button>
              </div>
              <div className="hist-meta">
                <span className="hist-date">{t.fecha_compra||t.fecha_escaneo?.slice(0,10)}</span>
                {t.total!=null && <span className="hist-total">{fmt(t.total)}</span>}
              </div>
              {t.matching?.length>0 && <div className="hist-match">🛒 {t.matching.map(m=>m.nombre).slice(0,3).join(", ")}</div>}
              {t.tags?.length>0 && <div className="hist-tags">{t.tags.map(tag=><span key={tag} className="hist-tag">{tag}</span>)}</div>}
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

      <main className="main">
        <div className="main-inner">
          {view!=="detail" && (
            <div className="main-nav">
              {navItems.map(([v,l])=>(
                <button key={v} className={`nav-tab ${view===v?"active":""}`} onClick={()=>{setView(v);setSelected(null);}}>{l}</button>
              ))}
            </div>
          )}

          {view==="detail"&&selected
            ? <TicketDetail ticket={selected} onBack={()=>{setView("dash");setSelected(null);}} onRefresh={()=>{loadHistorial();loadTags();}}/>
            : view==="scan" ? <ScanPanel onSaved={loadHistorial} historial={historial} currentUser={currentUser}/>
            : view==="analytics" ? <Analytics historial={historial}/>
            : view==="advanced" ? <AdvancedAnalysis historial={historial}/>
            : view==="lista" ? <ShoppingList/>
            : view==="budget" ? <Budget/>
            : view==="compare" ? <Compare historial={historial}/>
            : view==="alerts" ? <PriceAlerts/>
            : view==="trash" ? <Trash onRestored={loadHistorial}/>
            : view==="settings" ? <Settings historial={historial} theme={theme} onThemeToggle={toggleTheme}/>
            : <DashboardView historial={historial} onOpenTicket={openDetail}/>
          }
        </div>
      </main>
    </div>
  );
}
