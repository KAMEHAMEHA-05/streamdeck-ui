"use client";
import { useState, useRef, useEffect } from "react";
import { Radio, Wifi, WifiOff, Play, Pause, Plus, List, Loader, Copy, ChevronRight } from "lucide-react";
import { getPartyToken, createPartyWebSocket } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface RoomState {
  mainUrl: string;
  subUrl: string;
  timestamp: number;
  paused: boolean;
  queue: string[];
}

interface Room {
  id: string;
  token: string;
  ws: WebSocket | null;
  connected: boolean;
  state: RoomState;
}

const DEFAULT_STATE: RoomState = {
  mainUrl: "",
  subUrl: "",
  timestamp: 0,
  paused: true,
  queue: [],
};

export default function PartyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomId, setNewRoomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [editState, setEditState] = useState<RoomState>(DEFAULT_STATE);
  const [queueItem, setQueueItem] = useState("");
  const wsRefs = useRef<Record<string, WebSocket>>({});
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(wsRefs.current).forEach(ws => ws.close());
    };
  }, []);

  const connectRoom = async (roomId: string) => {
    try {
      const { token } = await getPartyToken(roomId);
      const ws = createPartyWebSocket(roomId, token);
      wsRefs.current[roomId] = ws;

      ws.onopen = () => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, connected: true, ws } : r));
        toast(`Connected to room "${roomId}"`, "success");
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as RoomState;
          setRooms(prev => prev.map(r => r.id === roomId ? { ...r, state: data } : r));
          setEditState(prev => activeRoom === roomId ? data : prev);
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, connected: false, ws: null } : r));
        toast(`Disconnected from "${roomId}"`, "info");
      };

      ws.onerror = () => {
        toast(`WebSocket error for "${roomId}"`, "error");
      };

      return { token, ws };
    } catch (e: unknown) {
      toast((e as Error).message || "Failed to connect", "error");
      return null;
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = newRoomId.trim();
    if (!id) return;
    if (rooms.find(r => r.id === id)) {
      toast("Room already added", "info");
      return;
    }
    setCreating(true);
    try {
      const result = await connectRoom(id);
      if (result) {
        setRooms(prev => [...prev, {
          id,
          token: result.token,
          ws: result.ws,
          connected: false,
          state: { ...DEFAULT_STATE }
        }]);
        setNewRoomId("");
        setActiveRoom(id);
        setEditState({ ...DEFAULT_STATE });
      }
    } finally {
      setCreating(false);
    }
  };

  const sendUpdate = (roomId: string, patch: Partial<RoomState>) => {
    const ws = wsRefs.current[roomId];
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast("Not connected", "error");
      return;
    }
    const newState = { ...editState, ...patch };
    setEditState(newState);
    ws.send(JSON.stringify(patch));
  };

  const addToQueue = () => {
    if (!queueItem.trim() || !activeRoom) return;
    const newQueue = [...editState.queue, queueItem.trim()];
    sendUpdate(activeRoom, { queue: newQueue });
    setQueueItem("");
    toast("Added to queue", "success");
  };

  const removeFromQueue = (idx: number) => {
    if (!activeRoom) return;
    const newQueue = editState.queue.filter((_, i) => i !== idx);
    sendUpdate(activeRoom, { queue: newQueue });
  };

  const activeRoomData = rooms.find(r => r.id === activeRoom);

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Party Rooms
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Manage live playback sync rooms via Durable Objects WebSocket
        </p>
      </div>

      {/* Add room */}
      <div className="glass-card" style={{ padding: 22 }}>
        <form onSubmit={handleCreateRoom} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Room ID</label>
            <input
              className="input-field"
              placeholder="e.g. main-stream"
              value={newRoomId}
              onChange={e => setNewRoomId(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" className="btn-primary" disabled={creating || !newRoomId.trim()}>
              {creating ? <Loader size={14} className="spin" /> : <Plus size={14} />}
              Connect Room
            </button>
          </div>
        </form>
      </div>

      {rooms.length === 0 ? (
        <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Radio size={28} style={{ margin: "0 auto 12px", display: "block", opacity: 0.2 }} />
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            No rooms connected. Enter a Room ID above to begin.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
          {/* Room list */}
          <div className="glass-card" style={{ overflow: "hidden", alignSelf: "start" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Rooms
              </span>
            </div>
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => { setActiveRoom(room.id); setEditState(room.state); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  width: "100%",
                  background: activeRoom === room.id ? "var(--accent-dim)" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${activeRoom === room.id ? "var(--accent)" : "transparent"}`,
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s"
                }}
              >
                <div className={room.connected ? "pulse" : ""} style={{
                  width: 6,
                  height: 6,
                  background: room.connected ? "var(--success)" : "var(--text-muted)",
                  flexShrink: 0
                }} />
                <span style={{ fontSize: "0.8rem", color: activeRoom === room.id ? "var(--accent)" : "var(--text-secondary)", flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {room.id}
                </span>
                {activeRoom === room.id && <ChevronRight size={12} color="var(--accent)" />}
              </button>
            ))}
          </div>

          {/* Room controls */}
          {activeRoomData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Status bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {activeRoomData.connected
                  ? <><Wifi size={14} color="var(--success)" /> <span className="badge badge-success">Live</span></>
                  : <><WifiOff size={14} color="var(--danger)" /> <span className="badge badge-danger">Disconnected</span></>
                }
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em", marginLeft: 4 }}>
                  Room: <strong style={{ color: "var(--accent)" }}>{activeRoomData.id}</strong>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeRoomData.token);
                    toast("Party token copied", "success");
                  }}
                  className="btn-ghost"
                  style={{ marginLeft: "auto", padding: "5px 10px" }}
                >
                  <Copy size={11} /> Token
                </button>
              </div>

              {/* Playback controls */}
              <div className="glass-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <Play size={14} color="var(--accent)" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Playback State
                  </span>
                  <div style={{ marginLeft: "auto" }}>
                    <button
                      onClick={() => sendUpdate(activeRoom!, { paused: !editState.paused })}
                      className={editState.paused ? "btn-primary" : "btn-ghost"}
                      style={{ padding: "7px 14px" }}
                    >
                      {editState.paused ? <Play size={13} /> : <Pause size={13} />}
                      {editState.paused ? "Play" : "Pause"}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label">Main Stream URL</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input-field"
                        placeholder="https://..."
                        value={editState.mainUrl}
                        onChange={e => setEditState(prev => ({ ...prev, mainUrl: e.target.value }))}
                      />
                      <button
                        className="btn-ghost"
                        onClick={() => sendUpdate(activeRoom!, { mainUrl: editState.mainUrl })}
                        style={{ flexShrink: 0 }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Sub Stream URL</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input-field"
                        placeholder="https://... (optional)"
                        value={editState.subUrl}
                        onChange={e => setEditState(prev => ({ ...prev, subUrl: e.target.value }))}
                      />
                      <button
                        className="btn-ghost"
                        onClick={() => sendUpdate(activeRoom!, { subUrl: editState.subUrl })}
                        style={{ flexShrink: 0 }}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Timestamp (seconds)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input-field"
                        type="number"
                        min={0}
                        value={editState.timestamp}
                        onChange={e => setEditState(prev => ({ ...prev, timestamp: parseFloat(e.target.value) || 0 }))}
                      />
                      <button
                        className="btn-ghost"
                        onClick={() => sendUpdate(activeRoom!, { timestamp: editState.timestamp })}
                        style={{ flexShrink: 0 }}
                      >
                        Seek
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue */}
              <div className="glass-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <List size={14} color="var(--accent)" />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                    Queue
                  </span>
                  <span className="badge badge-muted" style={{ marginLeft: "auto" }}>{editState.queue.length} items</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input
                    className="input-field"
                    placeholder="Add URL to queue..."
                    value={queueItem}
                    onChange={e => setQueueItem(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToQueue(); } }}
                  />
                  <button className="btn-primary" onClick={addToQueue} disabled={!queueItem.trim()} style={{ flexShrink: 0 }}>
                    <Plus size={13} />
                  </button>
                </div>

                {editState.queue.length === 0 ? (
                  <div style={{ padding: "18px", textAlign: "center", border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Queue is empty
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {editState.queue.map((url, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 700, minWidth: 20 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="mono" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                          {url}
                        </span>
                        <button
                          onClick={() => removeFromQueue(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
