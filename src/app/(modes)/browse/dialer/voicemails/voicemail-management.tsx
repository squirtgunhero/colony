"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import {
  Voicemail,
  Plus,
  Mic,
  Upload,
  Play,
  Pause,
  Square,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface VoicemailDrop {
  id: string;
  name: string;
  recordingUrl: string;
  duration: number | null;
  createdAt: string;
}

interface Props {
  initialDrops: VoicemailDrop[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function VoicemailManagement({ initialDrops }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);

  const [drops, setDrops] = useState<VoicemailDrop[]>(initialDrops);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preview playback for recorder
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Waveform animation bars
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(0.2));

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Animate waveform during recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setWaveformBars(Array(20).fill(0).map(() => 0.15 + Math.random() * 0.85));
    }, 120);
    return () => clearInterval(interval);
  }, [isRecording]);

  // --- Recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      alert("Microphone access is required to record voicemails.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingTime(0);
    setNewName("");
    setShowRecorder(false);
    setPreviewPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, [stopRecording]);

  const togglePreview = useCallback(() => {
    if (!recordedUrl) return;
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
      return;
    }
    const audio = new Audio(recordedUrl);
    previewAudioRef.current = audio;
    audio.onended = () => setPreviewPlaying(false);
    audio.play();
    setPreviewPlaying(true);
  }, [recordedUrl, previewPlaying]);

  const saveRecording = useCallback(async () => {
    if (!recordedBlob || !newName.trim()) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("file", recordedBlob, "recording.webm");
      formData.append("duration", String(recordingTime));

      const uploadRes = await fetch("/api/dialer/voicemail-drops/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const createRes = await fetch("/api/dialer/voicemail-drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          recordingUrl: url,
          duration: recordingTime,
        }),
      });
      if (!createRes.ok) throw new Error("Save failed");
      const drop = await createRes.json();

      setDrops((prev) => [
        { ...drop, createdAt: drop.createdAt || new Date().toISOString() },
        ...prev,
      ]);
      cancelRecording();
    } catch {
      alert("Failed to save voicemail recording.");
    } finally {
      setSaving(false);
    }
  }, [recordedBlob, newName, recordingTime, cancelRecording]);

  // --- Upload ---
  const handleFileUpload = useCallback(async (file: File) => {
    setSaving(true);

    try {
      // Get duration from the file
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio(URL.createObjectURL(file));
        audio.onloadedmetadata = () => {
          resolve(Math.round(audio.duration));
        };
        audio.onerror = () => resolve(0);
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("duration", String(duration));

      const uploadRes = await fetch("/api/dialer/voicemail-drops/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const name = file.name.replace(/\.[^/.]+$/, "");
      const createRes = await fetch("/api/dialer/voicemail-drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, recordingUrl: url, duration }),
      });
      if (!createRes.ok) throw new Error("Save failed");
      const drop = await createRes.json();

      setDrops((prev) => [
        { ...drop, createdAt: drop.createdAt || new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      alert("Failed to upload voicemail file.");
    } finally {
      setSaving(false);
    }
  }, []);

  // --- Playback ---
  const togglePlay = useCallback(
    (drop: VoicemailDrop) => {
      if (playingId === drop.id) {
        // Pause
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(drop.recordingUrl);
      audioRef.current = audio;
      setPlayingId(drop.id);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlayProgress((prev) => ({
            ...prev,
            [drop.id]: audio.currentTime / audio.duration,
          }));
        }
      };

      audio.onended = () => {
        setPlayingId(null);
        setPlayProgress((prev) => ({ ...prev, [drop.id]: 0 }));
      };

      audio.play();
    },
    [playingId],
  );

  // --- Rename ---
  const startRename = useCallback((drop: VoicemailDrop) => {
    setRenamingId(drop.id);
    setRenameValue(drop.name);
  }, []);

  const confirmRename = useCallback(
    async (id: string) => {
      if (!renameValue.trim()) return;
      try {
        const res = await fetch(`/api/dialer/voicemail-drops/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: renameValue.trim() }),
        });
        if (!res.ok) throw new Error();
        setDrops((prev) =>
          prev.map((d) => (d.id === id ? { ...d, name: renameValue.trim() } : d)),
        );
      } catch {
        alert("Failed to rename.");
      }
      setRenamingId(null);
    },
    [renameValue],
  );

  // --- Delete ---
  const confirmDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/dialer/voicemail-drops/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDrops((prev) => prev.filter((d) => d.id !== id));
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
    } catch {
      alert("Failed to delete.");
    }
    setDeletingId(null);
  }, [playingId]);

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.05),
    border: `1px solid ${withAlpha(theme.text, 0.08)}`,
    color: theme.text,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Voicemail Drops"
        subtitle="Record, upload, and manage voicemail messages"
        icon={Voicemail}
        overline="Dialer"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/browse/dialer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.7),
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        }
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2.5">
        <ActionButton
          label="Record New"
          icon={Mic}
          variant="primary"
          size="md"
          onClick={() => {
            setShowRecorder(true);
            setRecordedBlob(null);
            setRecordedUrl(null);
            setRecordingTime(0);
            setNewName("");
          }}
          disabled={showRecorder}
        />
        <ActionButton
          label="Upload File"
          icon={Upload}
          variant="secondary"
          size="md"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Recorder */}
      {showRecorder && (
        <SectionCard title="New Recording">
          <div className="space-y-4">
            {/* Waveform / Recording state */}
            <div
              className="flex items-center justify-center h-16 rounded-xl gap-[3px]"
              style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
            >
              {isRecording ? (
                waveformBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full transition-all duration-100"
                    style={{
                      height: `${h * 40}px`,
                      backgroundColor: withAlpha(theme.accent, 0.7),
                    }}
                  />
                ))
              ) : recordedUrl ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePreview}
                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                  >
                    {previewPlaying ? (
                      <Pause className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                    ) : (
                      <Play className="h-3.5 w-3.5 ml-0.5" style={{ color: theme.accent }} />
                    )}
                  </button>
                  <span className="text-[13px]" style={{ color: withAlpha(theme.text, 0.6) }}>
                    Recording ready - {formatDuration(recordingTime)}
                  </span>
                </div>
              ) : (
                <span className="text-[13px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                  Click record to start
                </span>
              )}
            </div>

            {/* Timer when recording */}
            {isRecording && (
              <div className="text-center">
                <span
                  className="text-[15px] font-medium tabular-nums"
                  style={{ color: theme.text }}
                >
                  {formatDuration(recordingTime)}
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!recordedBlob && !isRecording && (
                <button
                  onClick={startRecording}
                  className="h-10 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                  style={{ backgroundColor: "#ef4444", color: "#fff" }}
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="h-10 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                  style={{ backgroundColor: withAlpha(theme.text, 0.08), color: theme.text }}
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              )}

              {recordedBlob && !isRecording && (
                <>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name this voicemail..."
                    className="h-10 px-3 rounded-xl text-[13px] flex-1 outline-none"
                    style={inputStyle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newName.trim()) saveRecording();
                    }}
                  />
                  <button
                    onClick={saveRecording}
                    disabled={!newName.trim() || saving}
                    className="h-10 px-4 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
                    style={{ backgroundColor: theme.accent, color: theme.bg }}
                  >
                    <Check className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordedUrl(null);
                      setRecordingTime(0);
                    }}
                    className="h-10 px-3 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.06),
                      color: withAlpha(theme.text, 0.6),
                    }}
                  >
                    <Mic className="h-4 w-4" />
                    Re-record
                  </button>
                </>
              )}

              <button
                onClick={cancelRecording}
                className="h-10 px-3 rounded-xl text-[13px] font-medium inline-flex items-center gap-2 transition-all active:scale-[0.97] ml-auto"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.06),
                  color: withAlpha(theme.text, 0.5),
                }}
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Voicemail list */}
      {drops.length === 0 && !showRecorder ? (
        <EmptyState
          icon={Voicemail}
          title="No voicemail drops yet"
          description="Record or upload a voicemail message to use during power dialing sessions."
          action={
            <ActionButton
              label="Record Your First"
              icon={Plus}
              variant="primary"
              onClick={() => setShowRecorder(true)}
            />
          }
        />
      ) : (
        drops.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${borderColor}` }}
          >
            {drops.map((drop) => {
              const isPlaying = playingId === drop.id;
              const progress = playProgress[drop.id] || 0;
              const isRenaming = renamingId === drop.id;
              const isDeleting = deletingId === drop.id;

              return (
                <div
                  key={drop.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: `0.5px solid ${borderColor}` }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = withAlpha(
                      theme.text,
                      0.02,
                    );
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(drop)}
                    className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
                    style={{
                      backgroundColor: isPlaying
                        ? withAlpha(theme.accent, 0.15)
                        : withAlpha(theme.text, 0.06),
                    }}
                  >
                    {isPlaying ? (
                      <Pause
                        className="h-3.5 w-3.5"
                        style={{ color: theme.accent }}
                      />
                    ) : (
                      <Play
                        className="h-3.5 w-3.5 ml-0.5"
                        style={{ color: withAlpha(theme.text, 0.5) }}
                      />
                    )}
                  </button>

                  {/* Name + progress + meta */}
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 px-2 rounded-lg text-[13px] outline-none flex-1"
                          style={inputStyle}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRename(drop.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                        />
                        <button
                          onClick={() => confirmRename(drop.id)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
                          style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
                        >
                          <Check className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
                          style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
                        >
                          <X
                            className="h-3.5 w-3.5"
                            style={{ color: withAlpha(theme.text, 0.4) }}
                          />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p
                          className="text-[13px] font-medium truncate"
                          style={{ color: theme.text }}
                        >
                          {drop.name}
                        </p>
                        {/* Progress bar */}
                        {isPlaying && (
                          <div
                            className="h-1 rounded-full mt-1.5 overflow-hidden"
                            style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${progress * 100}%`,
                                backgroundColor: theme.accent,
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[11px]"
                            style={{ color: withAlpha(theme.text, 0.4) }}
                          >
                            {formatDuration(drop.duration)}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: withAlpha(theme.text, 0.25) }}
                          >
                            &middot;
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: withAlpha(theme.text, 0.35) }}
                          >
                            {formatDate(drop.createdAt)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isRenaming && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startRename(drop)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-95 hover:opacity-80"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => confirmDelete(drop.id)}
                            className="h-8 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
                            style={{ backgroundColor: withAlpha("#ef4444", 0.12), color: "#ef4444" }}
                          >
                            <Check className="h-3 w-3" />
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
                            style={{ color: withAlpha(theme.text, 0.35) }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(drop.id)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-95 hover:opacity-80"
                          style={{ color: withAlpha(theme.text, 0.35) }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
