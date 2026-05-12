import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, getDocs, writeBatch, doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

const CELL = 90;
const COLS = 10;
const ROWS = 8;
const CANVAS_W = CELL * COLS;
const CANVAS_H = CELL * ROWS;

interface Table {
  id: string;
  x: number;
  y: number;
  capacity: number;
  floor: number;
  label?: string;
}

interface DragState {
  tableId: string;
  startMouseX: number;
  startMouseY: number;
  startPx: number;
  startPy: number;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  onBack: () => void;
}

function tableSize(capacity: number): { w: number; h: number } {
  if (capacity <= 2) return { w: 1, h: 1 };
  if (capacity <= 4) return { w: 2, h: 1 };
  if (capacity <= 6) return { w: 2, h: 1 };
  return { w: 2, h: 2 };
}

function tableColor(capacity: number): string {
  if (capacity <= 2) return '#43A047';
  if (capacity <= 4) return '#E53935';
  if (capacity <= 6) return '#8E24AA';
  return '#E64A19';
}

function isRound(capacity: number) { return capacity <= 2; }

function findFreeCell(tables: Table[], floor: number): { x: number; y: number } {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS - 1; x++) {
      const occupied = tables.some((t) => t.floor === floor && t.x === x && t.y === y);
      if (!occupied) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

const PHONE_INNER_W = 188;

function MobilePreview({
  tables,
  floor,
  drag,
  dragPos,
}: {
  tables: Table[];
  floor: number;
  drag: DragState | null;
  dragPos: { px: number; py: number } | null;
}) {
  const visible = tables.filter((t) => t.floor === floor);

  const maxExtX = visible.reduce((m, t) => Math.max(m, t.x + tableSize(t.capacity).w), 4);
  const maxExtY = visible.reduce((m, t) => Math.max(m, t.y + tableSize(t.capacity).h), 3);
  const contentW = maxExtX * CELL;
  const contentH = maxExtY * CELL;
  const scale = Math.min(PHONE_INNER_W / contentW, 1);
  const scaledH = Math.round(contentH * scale);

  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 10px',
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
        Vista móvil
      </div>

      {/* Phone frame */}
      <div style={{
        background: '#111',
        borderRadius: 30,
        padding: '14px 8px 10px',
        border: '2px solid #333',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      }}>
        <div style={{ width: 32, height: 4, background: '#2a2a2a', borderRadius: 2, marginBottom: 8 }} />

        {/* Screen */}
        <div style={{
          width: PHONE_INNER_W,
          background: '#F7F3EC',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ background: '#0f0f17', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>9:41</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>●●●</span>
          </div>
          <div style={{ background: '#0f0f17', padding: '4px 10px 6px', flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Reservar mesa</span>
          </div>
          <div style={{ textAlign: 'center', padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
            <span style={{ fontSize: 6, color: '#999', letterSpacing: 1.5, fontWeight: 700 }}>ENTRADA</span>
          </div>

          {/* Scaled canvas */}
          <div style={{ width: PHONE_INNER_W, height: scaledH, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <div style={{
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              width: contentW,
              height: contentH,
              position: 'relative',
            }}>
              {visible.map((t) => {
                const { w: gw, h: gh } = tableSize(t.capacity);
                const round = isRound(t.capacity);
                const color = tableColor(t.capacity);
                const isDragging = drag?.tableId === t.id;
                const px = isDragging && dragPos ? dragPos.px : t.x * CELL;
                const py = isDragging && dragPos ? dragPos.py : t.y * CELL;
                const tw = gw * CELL - 8;
                const th = gh * CELL - 8;
                return (
                  <div key={t.id} style={{
                    position: 'absolute',
                    left: px + 4,
                    top: py + 4,
                    width: tw,
                    height: th,
                    background: color,
                    borderRadius: round ? tw / 2 : 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                  }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>
                      {t.label ?? `${t.capacity}p`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ width: 48, height: 3, background: '#2a2a2a', borderRadius: 1.5, marginTop: 8 }} />
      </div>
    </div>
  );
}

export default function Editor({ restaurantId, restaurantName, onBack }: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [floor, setFloor] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState<{ px: number; py: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<{ x: number; y: number } | null>(null);
  const [addCapacity, setAddCapacity] = useState(4);
  const [addLabel, setAddLabel] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const floors = [...new Set(tables.map((t) => t.floor))].sort();
  if (!floors.includes(floor) && floors.length > 0) setFloor(floors[0]);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'tables'));
      const loaded: Table[] = snap.docs.map((d) => ({
        id: d.id,
        x: d.data().x ?? 0,
        y: d.data().y ?? 0,
        capacity: d.data().capacity ?? 4,
        floor: d.data().floor ?? 1,
        label: d.data().label,
      }));
      setTables(loaded);

      // load bg image
      try {
        const url = await getDownloadURL(ref(storage, `restaurants/${restaurantId}/floorplan.jpg`));
        setBgImage(url);
      } catch {
        // no bg image yet
      }

      setLoading(false);
    };
    fetch();
  }, [restaurantId]);

  // Mouse move / up handlers for drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      setDragPos({ px: drag.startPx + dx, py: drag.startPy + dy });
    },
    [drag],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!drag || !dragPos) { setDrag(null); return; }
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      const newPx = drag.startPx + dx;
      const newPy = drag.startPy + dy;

      // snap to grid
      const newX = Math.max(0, Math.min(COLS - 1, Math.round(newPx / CELL)));
      const newY = Math.max(0, Math.min(ROWS - 1, Math.round(newPy / CELL)));

      setTables((prev) =>
        prev.map((t) => (t.id === drag.tableId ? { ...t, x: newX, y: newY } : t)),
      );
      setDrag(null);
      setDragPos(null);
    },
    [drag, dragPos],
  );

  useEffect(() => {
    if (drag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [drag, handleMouseMove, handleMouseUp]);

  const handleCanvasClick = () => {
    setSelectedId(null);
  };

  const handleAddClick = () => {
    const pos = findFreeCell(tables, floor);
    setShowAddModal(pos);
    setAddCapacity(4);
    setAddLabel('');
  };

  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    setSelectedId(table.id);
    setDrag({
      tableId: table.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPx: table.x * CELL,
      startPy: table.y * CELL,
    });
  };

  const handleAddTable = () => {
    if (!showAddModal) return;
    const newTable: Table = {
      id: `local_${Date.now()}`,
      x: showAddModal.x,
      y: showAddModal.y,
      capacity: addCapacity,
      floor,
      label: addLabel.trim() || undefined,
    };
    setTables((prev) => [...prev, newTable]);
    setShowAddModal(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setTables((prev) => prev.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'restaurants', restaurantId, 'tables');

      // delete existing tables not in current list
      const snap = await getDocs(colRef);
      snap.docs.forEach((d) => {
        if (!tables.find((t) => t.id === d.id)) {
          batch.delete(d.ref);
        }
      });

      // upsert all current tables
      tables.forEach((t) => {
        const isNew = t.id.startsWith('local_');
        const docRef = isNew ? doc(colRef) : doc(colRef, t.id);
        batch.set(docRef, {
          x: t.x,
          y: t.y,
          capacity: t.capacity,
          floor: t.floor,
          ...(t.label ? { label: t.label } : {}),
        });
      });

      await batch.commit();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      // Reload to get real ids
      const freshSnap = await getDocs(colRef);
      setTables(
        freshSnap.docs.map((d) => ({
          id: d.id,
          x: d.data().x,
          y: d.data().y,
          capacity: d.data().capacity,
          floor: d.data().floor ?? 1,
          label: d.data().label,
        })),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const storageRef = ref(storage, `restaurants/${restaurantId}/floorplan.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBgImage(url);
    } finally {
      setUploadingBg(false);
    }
  };

  const addFloor = () => {
    const next = Math.max(...(floors.length ? floors : [0])) + 1;
    setFloor(next);
  };

  const visibleTables = tables.filter((t) => t.floor === floor);
  const selected = tables.find((t) => t.id === selectedId);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Cargando mesas...</span>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={onBack}>← Restaurantes</button>
          <span style={styles.headerName}>{restaurantName}</span>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.bgBtn}
            onClick={() => bgInputRef.current?.click()}
            disabled={uploadingBg}
          >
            {uploadingBg ? 'Subiendo...' : bgImage ? 'Cambiar fondo' : '+ Imagen de fondo'}
          </button>
          <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
          <button
            style={{ ...styles.saveBtn, ...(saved ? styles.saveBtnSuccess : {}) }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sideSection}>
            <div style={styles.sideTitle}>Pisos</div>
            {(floors.length ? floors : [1]).map((f) => (
              <button
                key={f}
                style={{ ...styles.floorBtn, ...(f === floor ? styles.floorBtnActive : {}) }}
                onClick={() => setFloor(f)}
              >
                Piso {f}
              </button>
            ))}
            <button style={styles.addFloorBtn} onClick={addFloor}>+ Agregar piso</button>
          </div>

          <div style={styles.sideSection}>
            <div style={styles.sideTitle}>Referencia</div>
            {[2, 4, 6, 8].map((cap) => (
              <div key={cap} style={styles.legendRow}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: tableColor(cap),
                    borderRadius: isRound(cap) ? '50%' : 4,
                  }}
                />
                <span style={styles.legendLabel}>{cap} personas</span>
              </div>
            ))}
          </div>

          <div style={styles.sideSection}>
            <button style={styles.addTableBtn} onClick={handleAddClick}>
              + Agregar mesa
            </button>
          </div>

          <div style={styles.sideSection}>
            <div style={styles.sideTitle}>Instrucciones</div>
            <p style={styles.hint}>• Arrastrar para mover</p>
            <p style={styles.hint}>• Click en mesa para seleccionar</p>
            <p style={styles.hint}>• Seleccionada → Eliminar mesa</p>
          </div>

          {selected && (
            <div style={styles.sideSection}>
              <div style={styles.sideTitle}>Mesa seleccionada</div>
              <div style={styles.selInfo}>
                <span>{selected.capacity} personas</span>
                {selected.label && <span> · {selected.label}</span>}
                <span style={styles.selPos}> ({selected.x}, {selected.y})</span>
              </div>
              <button style={styles.deleteBtn} onClick={handleDeleteSelected}>
                Eliminar mesa
              </button>
            </div>
          )}
        </aside>

        {/* Canvas area */}
        <div style={styles.canvasWrap}>
          <div
            ref={canvasRef}
            style={{
              ...styles.canvas,
              width: CANVAS_W,
              height: CANVAS_H,
              cursor: drag ? 'grabbing' : 'default',
            }}
            onClick={handleCanvasClick}
          >
            {/* Background image */}
            {bgImage && (
              <img
                src={bgImage}
                alt="plano"
                style={styles.bgImg}
                draggable={false}
              />
            )}

            {/* Grid lines */}
            {Array.from({ length: COLS + 1 }).map((_, i) => (
              <div
                key={`vl${i}`}
                style={{
                  position: 'absolute',
                  left: i * CELL,
                  top: 0,
                  width: 1,
                  height: CANVAS_H,
                  background: 'rgba(255,255,255,0.06)',
                  pointerEvents: 'none',
                }}
              />
            ))}
            {Array.from({ length: ROWS + 1 }).map((_, i) => (
              <div
                key={`hl${i}`}
                style={{
                  position: 'absolute',
                  top: i * CELL,
                  left: 0,
                  height: 1,
                  width: CANVAS_W,
                  background: 'rgba(255,255,255,0.06)',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Tables */}
            {visibleTables.map((t) => {
              const { w, h } = tableSize(t.capacity);
              const round = isRound(t.capacity);
              const color = tableColor(t.capacity);
              const isDragging = drag?.tableId === t.id;
              const px = isDragging && dragPos ? dragPos.px : t.x * CELL;
              const py = isDragging && dragPos ? dragPos.py : t.y * CELL;
              const isSelected = selectedId === t.id;

              return (
                <div
                  key={t.id}
                  onMouseDown={(e) => handleTableMouseDown(e, t)}
                  style={{
                    position: 'absolute',
                    left: px + 6,
                    top: py + 6,
                    width: w * CELL - 12,
                    height: h * CELL - 12,
                    background: color,
                    borderRadius: round ? '50%' : 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    zIndex: isDragging ? 100 : 1,
                    opacity: isDragging ? 0.85 : 1,
                    outline: isSelected ? '3px solid #fff' : 'none',
                    outlineOffset: 2,
                    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: isDragging ? 'none' : 'left 0.1s, top 0.1s',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                    {t.label ?? `${t.capacity}p`}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={styles.canvasNote}>
            Piso {floor} · {visibleTables.length} mesa{visibleTables.length !== 1 ? 's' : ''}
          </p>
        </div>

        <MobilePreview tables={tables} floor={floor} drag={drag} dragPos={dragPos} />
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div style={styles.overlay} onClick={() => setShowAddModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Nueva mesa</h3>
            <p style={styles.modalSub}>Piso {floor} · Se agrega en primera celda libre, podés moverla después.</p>

            <label style={styles.modalLabel}>Capacidad</label>
            <select
              style={styles.modalSelect}
              value={addCapacity}
              onChange={(e) => setAddCapacity(Number(e.target.value))}
            >
              {[2, 4, 6, 8].map((c) => (
                <option key={c} value={c}>{c} personas</option>
              ))}
            </select>

            <label style={styles.modalLabel}>Etiqueta (opcional)</label>
            <input
              style={styles.modalInput}
              type="text"
              placeholder='Ej: "VIP", "A1", "Terraza"'
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              maxLength={12}
            />

            <div style={styles.modalPreview}>
              <div
                style={{
                  width: isRound(addCapacity) ? 60 : 100,
                  height: 60,
                  borderRadius: isRound(addCapacity) ? '50%' : 10,
                  background: tableColor(addCapacity),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {addLabel.trim() || `${addCapacity}p`}
              </div>
            </div>

            <div style={styles.modalBtns}>
              <button style={styles.modalCancel} onClick={() => setShowAddModal(null)}>Cancelar</button>
              <button style={styles.modalConfirm} onClick={handleAddTable}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: 56,
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 12px',
    color: 'var(--text)',
    fontSize: 13,
  },
  headerName: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  bgBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 14px',
    color: 'var(--text)',
    fontSize: 13,
  },
  saveBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 22px',
    fontSize: 14,
    fontWeight: 700,
  },
  saveBtnSuccess: { background: 'var(--success)' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 220,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    overflowY: 'auto',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    flexShrink: 0,
  },
  sideSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  sideTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  floorBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 7,
    padding: '7px 10px',
    color: 'var(--text)',
    fontSize: 13,
    textAlign: 'left',
  },
  floorBtnActive: { background: 'var(--primary)', borderColor: 'var(--primary)' },
  addTableBtn: {
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    width: '100%',
  },
  addFloorBtn: {
    background: 'transparent',
    border: '1px dashed var(--border)',
    borderRadius: 7,
    padding: '7px 10px',
    color: 'var(--text-secondary)',
    fontSize: 13,
    textAlign: 'left',
  },
  legendRow: { display: 'flex', alignItems: 'center', gap: 10 },
  legendDot: { width: 22, height: 22, flexShrink: 0 },
  legendLabel: { fontSize: 13, color: 'var(--text-secondary)' },
  hint: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 },
  selInfo: { fontSize: 13, color: 'var(--text)', marginBottom: 8 },
  selPos: { color: 'var(--text-secondary)' },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid var(--primary)',
    borderRadius: 7,
    padding: '7px 0',
    color: 'var(--primary)',
    fontSize: 13,
    fontWeight: 600,
  },
  canvasWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    overflow: 'auto',
    background: 'var(--dark)',
  },
  canvas: {
    position: 'relative',
    background: '#1c1c2e',
    borderRadius: 12,
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  },
  bgImg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.25,
    pointerEvents: 'none',
  },
  canvasNote: { marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '28px 28px 24px',
    width: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 },
  modalSub: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 },
  modalLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 },
  modalSelect: {
    width: '100%',
    background: 'var(--dark)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--text)',
    fontSize: 14,
    marginBottom: 14,
    outline: 'none',
  },
  modalInput: {
    width: '100%',
    background: 'var(--dark)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--text)',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  modalPreview: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  modalBtns: { display: 'flex', gap: 10 },
  modalCancel: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 0',
    color: 'var(--text)',
    fontSize: 14,
  },
  modalConfirm: {
    flex: 1,
    background: 'var(--primary)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
  },
};
