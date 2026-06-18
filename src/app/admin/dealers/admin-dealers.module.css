.root { width: 100%; }

.header {
  background: var(--navy-2);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 2rem 2.5rem;
}
 
.heading {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  color: #fff;
  font-size: 1.6rem;
}

.sub { color: rgba(255,255,255,0.55); margin-top: 0.25rem; font-size: 0.92rem; }

.body { padding: 2rem 2.5rem; }

/* ── Tabs ── */
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--navy-2);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  transition: all 0.15s;
}
.tab:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
.tabActive { background: rgba(26,86,219,0.16); border-color: var(--blue); color: #fff; }

.tabCount {
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  min-width: 1.4rem;
  text-align: center;
}
.tabActive .tabCount { background: var(--blue); }

/* ── Loading ── */
.skeletonList { display: flex; flex-direction: column; gap: 0.6rem; }
.skeletonRow {
  height: 56px;
  border-radius: var(--radius);
  background: linear-gradient(90deg, var(--navy-2) 0%, rgba(255,255,255,0.04) 50%, var(--navy-2) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Error / Empty ── */
.errorBox {
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(220,38,38,0.1);
  border: 1px solid rgba(220,38,38,0.3);
  color: #FCA5A5;
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 4rem 2rem;
  color: rgba(255,255,255,0.35);
  text-align: center;
}
.emptyState p { margin: 0; font-size: 0.9rem; }

/* ── Table ── */
.tableWrap {
  background: var(--navy-2);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.table { width: 100%; border-collapse: collapse; }

.table th {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.85rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
}

.table td {
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 0.875rem;
  color: rgba(255,255,255,0.8);
  vertical-align: middle;
  white-space: nowrap;
}

.table tbody tr:last-child td { border-bottom: none; }
.table tbody tr:hover td { background: rgba(255,255,255,0.025); }

.dealerName { font-weight: 600; color: #fff; }
.dealerContact { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin-top: 0.15rem; }
.muted { color: rgba(255,255,255,0.55); }

/* ── Badges ── */
.tierBadge, .statusBadge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  text-transform: capitalize;
}
.tierBadge[data-tier="basic"]    { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
.tierBadge[data-tier="standard"] { background: rgba(26,86,219,0.15); color: #60A5FA; }
.tierBadge[data-tier="premium"]  { background: rgba(217,119,6,0.15); color: var(--amber); }

.statusBadge[data-status="active"]    { background: rgba(5,150,105,0.15); color: #34D399; }
.statusBadge[data-status="pending"]   { background: rgba(217,119,6,0.15); color: var(--amber); }
.statusBadge[data-status="suspended"] { background: rgba(220,38,38,0.15); color: #F87171; }

/* ── Action buttons ── */
.actionsCell { display: flex; align-items: center; gap: 0.5rem; }

.approveBtn {
  background: rgba(5,150,105,0.15);
  border: 1px solid rgba(5,150,105,0.35);
  color: #34D399;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  transition: opacity 0.15s;
}
.approveBtn:hover { opacity: 0.8; }
.approveBtn:disabled { opacity: 0.5; cursor: default; }

.suspendBtn {
  background: rgba(220,38,38,0.1);
  border: 1px solid rgba(220,38,38,0.3);
  color: #F87171;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  transition: opacity 0.15s;
}
.suspendBtn:hover { opacity: 0.8; }
.suspendBtn:disabled { opacity: 0.5; cursor: default; }

.editBtn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.7);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  transition: all 0.15s;
}
.editBtn:hover { background: rgba(255,255,255,0.12); color: #fff; }

/* ── Modal ── */
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
}

.modal {
  background: var(--navy-2);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}

.modalTitle {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  color: #fff;
  font-size: 1.15rem;
  margin-bottom: 0.5rem;
}

.modalSub {
  color: rgba(255,255,255,0.55);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.modalField { margin-bottom: 1.1rem; }

.modalLabel {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  margin-bottom: 0.5rem;
}

.modalInput, .modalTextarea {
  width: 100%;
  background: var(--navy);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.875rem;
  resize: vertical;
}
.modalInput:focus, .modalTextarea:focus { outline: none; border-color: var(--blue); }

.chipGroup { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.chip {
  background: var(--navy);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  border-radius: 7px;
  transition: all 0.15s;
}
.chip:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
.chipActive { background: rgba(26,86,219,0.18); border-color: var(--blue); color: #fff; }

.modalError {
  background: rgba(220,38,38,0.1);
  border: 1px solid rgba(220,38,38,0.3);
  color: #FCA5A5;
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.82rem;
  margin-bottom: 1rem;
}

.modalActions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.5rem; }

.modalCancelBtn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  transition: all 0.15s;
}
.modalCancelBtn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
.modalCancelBtn:disabled { opacity: 0.5; cursor: default; }

.modalSaveBtn {
  background: var(--blue);
  border: none;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  transition: opacity 0.15s;
}
.modalSaveBtn:hover { opacity: 0.85; }
.modalSaveBtn:disabled { opacity: 0.5; cursor: default; }

.modalDangerBtn {
  background: var(--red);
  border: none;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  transition: opacity 0.15s;
}
.modalDangerBtn:hover { opacity: 0.85; }
.modalDangerBtn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 900px) {
  .header, .body { padding: 1.5rem; }
}
