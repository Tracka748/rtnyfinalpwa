'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanStatus = 'idle' | 'loading' | 'success' | 'already_used' | 'not_found' | 'invalid' | 'error';

interface VerifySuccess {
  success: true;
  ticket: {
    id: string;
    ticket_number: string;
    confirmation_code: string;
    ticket_type: string;
    status: string;
  };
  event: { id: string; name: string; event_date: string } | null;
  holder: { display_name: string; email: string | null };
}

interface ScanResult {
  status: ScanStatus;
  message: string;
  detail?: string;
  data?: VerifySuccess;
  scanned_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Status UI config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Exclude<ScanStatus, 'idle' | 'loading'>,
  { bg: string; border: string; icon: string; label: string; textColor: string }
> = {
  success:      { bg: 'bg-[#59FFA0]/10', border: 'border-[#59FFA0]/40', icon: '✅', label: 'VALID',        textColor: 'text-[#59FFA0]' },
  already_used: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', icon: '⚠️', label: 'ALREADY USED', textColor: 'text-yellow-400' },
  not_found:    { bg: 'bg-red-500/10',    border: 'border-red-500/40',    icon: '❌', label: 'NOT FOUND',    textColor: 'text-red-400'    },
  invalid:      { bg: 'bg-red-500/10',    border: 'border-red-500/40',    icon: '🚫', label: 'INVALID',      textColor: 'text-red-400'    },
  error:        { bg: 'bg-white/5',       border: 'border-white/20',      icon: '⚙️', label: 'ERROR',        textColor: 'text-[#7DD8E8]'  },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [barcodeSupported, setBarcodeSupported] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check BarcodeDetector support on mount
  useEffect(() => {
    setBarcodeSupported('BarcodeDetector' in window);
  }, []);

  // ── API call ─────────────────────────────────────────────────────────────

  const verify = useCallback(async (code: string) => {
    if (!code.trim() || cooldownRef.current) return;

    cooldownRef.current = true;
    setScanCooldown(true);
    setResult({ status: 'loading', message: 'Verifying…' });

    try {
      const res = await fetch('/api/v1/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const json = await res.json();

      if (res.status === 200 && json.success) {
        setResult({ status: 'success', message: 'Ticket is valid', data: json });
      } else if (res.status === 409) {
        setResult({
          status: 'already_used',
          message: 'Ticket already scanned',
          detail: json.scanned_at ? `Scanned at ${formatTime(json.scanned_at)}` : undefined,
          scanned_at: json.scanned_at,
        });
      } else if (res.status === 404) {
        setResult({ status: 'not_found', message: 'Ticket not found', detail: `Code: ${code.trim()}` });
      } else if (res.status === 410) {
        setResult({
          status: 'invalid',
          message: 'Ticket is not valid',
          detail: json.status ? `Status: ${json.status}` : undefined,
        });
      } else {
        setResult({ status: 'error', message: json.error || 'Unknown error' });
      }
    } catch (err) {
      setResult({ status: 'error', message: 'Network error — check connection' });
    }

    // Allow re-scanning after 2.5 s
    setTimeout(() => {
      cooldownRef.current = false;
      setScanCooldown(false);
    }, 2500);
  }, []);

  // ── Camera / BarcodeDetector ──────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Set up BarcodeDetector scanning loop
      if (barcodeSupported) {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'],
        });

        const scan = async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0 && !cooldownRef.current) {
              const raw = barcodes[0].rawValue as string;
              if (raw) {
                // Flash feedback
                setResult({ status: 'loading', message: `Detected: ${raw.slice(0, 20)}…` });
                await verify(raw);
              }
            }
          } catch {
            // Detection errors are non-fatal, keep scanning
          }
          animFrameRef.current = requestAnimationFrame(scan);
        };
        animFrameRef.current = requestAnimationFrame(scan);
      }
    } catch (err: any) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access and try again.'
          : 'Could not access camera. Use manual entry below.'
      );
    }
  }, [barcodeSupported, verify]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    verify(manualCode);
    setManualCode('');
  }

  function handleClear() {
    setResult(null);
    setManualCode('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ── Result panel ──────────────────────────────────────────────────────────

  function ResultPanel({ r }: { r: ScanResult }) {
    if (r.status === 'loading') {
      return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3 animate-spin inline-block">⏳</div>
          <p className="text-[#7DD8E8] font-medium">{r.message}</p>
        </div>
      );
    }

    const cfg = STATUS_CONFIG[r.status];

    return (
      <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cfg.icon}</span>
            <div>
              <p className={`text-xl font-header font-bold tracking-wide ${cfg.textColor}`}>
                {cfg.label}
              </p>
              <p className="text-sm text-[#7DD8E8]">{r.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-3 py-1.5 bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
          >
            Clear
          </button>
        </div>

        {r.detail && (
          <p className="text-xs text-[#7DD8E8] bg-black/20 rounded-lg px-3 py-2">{r.detail}</p>
        )}

        {/* Success details */}
        {r.status === 'success' && r.data && (
          <div className="space-y-3">
            {/* Holder */}
            <div className="bg-black/20 rounded-lg p-4 space-y-1">
              <p className="text-xs uppercase tracking-wider text-[#7DD8E8] font-medium mb-2">Ticket Holder</p>
              <p className="text-lg font-bold text-white">{r.data.holder.display_name}</p>
              {r.data.holder.email && (
                <p className="text-sm text-[#7DD8E8]">{r.data.holder.email}</p>
              )}
            </div>

            {/* Ticket */}
            <div className="bg-black/20 rounded-lg p-4 space-y-1">
              <p className="text-xs uppercase tracking-wider text-[#7DD8E8] font-medium mb-2">Ticket</p>
              <p className="text-white font-medium">{r.data.ticket.ticket_type}</p>
              <p className="text-sm text-[#7DD8E8] font-mono">{r.data.ticket.ticket_number}</p>
              <p className="text-xs text-[#7DD8E8] font-mono opacity-70">{r.data.ticket.confirmation_code}</p>
            </div>

            {/* Event */}
            {r.data.event && (
              <div className="bg-black/20 rounded-lg p-4 space-y-1">
                <p className="text-xs uppercase tracking-wider text-[#7DD8E8] font-medium mb-2">Event</p>
                <p className="text-white font-medium">{r.data.event.name}</p>
                <p className="text-sm text-[#7DD8E8]">{formatDate(r.data.event.event_date)}</p>
              </div>
            )}
          </div>
        )}

        {/* Already-used timestamp */}
        {r.status === 'already_used' && r.scanned_at && (
          <div className="bg-black/20 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8] font-medium mb-1">Scanned At</p>
            <p className="text-yellow-300 font-medium">{formatDate(r.scanned_at)}</p>
            <p className="text-yellow-400 text-sm">{formatTime(r.scanned_at)}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Page header */}
      <div className="hidden md:block">
        <h1 className="text-2xl lg:text-3xl font-header font-bold text-white mb-1">
          Ticket Scanner
        </h1>
        <p className="text-sm text-[#7DD8E8]">Scan QR codes or enter confirmation codes manually</p>
      </div>

      {/* Camera scanner */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📷</span>
            <span className="font-medium text-white text-sm">Camera Scanner</span>
            {!barcodeSupported && cameraActive && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-0.5 ml-1">
                No auto-detect — use manual entry
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={cameraActive ? stopCamera : startCamera}
            className={[
              'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
              cameraActive
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-[#007BFF]/20 text-[#007BFF] border border-[#007BFF]/30 hover:bg-[#007BFF]/30',
            ].join(' ')}
          >
            {cameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>
        </div>

        {/* Video viewport */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`}
            playsInline
            muted
          />

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#7DD8E8] gap-2">
              <span className="text-4xl opacity-40">📷</span>
              <p className="text-sm opacity-60">Camera off</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-yellow-400">{cameraError}</p>
            </div>
          )}

          {/* Scan overlay — only shown when BarcodeDetector is active */}
          {cameraActive && barcodeSupported && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-[#59FFA0]/60 rounded-xl relative">
                {/* Corner accents */}
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-[#59FFA0] rounded-tl-lg" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-[#59FFA0] rounded-tr-lg" />
                <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-[#59FFA0] rounded-bl-lg" />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-[#59FFA0] rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Cooldown flash */}
          {scanCooldown && cameraActive && (
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-[#59FFA0]/20 text-[#59FFA0] border border-[#59FFA0]/30 rounded-full px-2 py-0.5">
                Scanned
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Manual entry */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">⌨️</span>
          <span className="font-medium text-white text-sm">Manual Entry</span>
        </div>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Confirmation code or ticket number…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#007BFF]/50 focus:bg-white/8 transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || scanCooldown}
            className="px-4 py-2 bg-[#007BFF]/20 text-[#007BFF] border border-[#007BFF]/30 rounded-lg text-sm font-medium hover:bg-[#007BFF]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Verify
          </button>
        </form>
        <p className="text-xs text-[#7DD8E8] opacity-60">
          Accepts both confirmation codes (e.g. CONF-XXXX) and ticket numbers
        </p>
      </div>

      {/* Result */}
      {result && <ResultPanel r={result} />}

      {/* Tips */}
      {!result && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <p className="text-xs font-medium text-[#7DD8E8] mb-2 uppercase tracking-wider">Tips</p>
          <ul className="text-xs text-[#7DD8E8] opacity-70 space-y-1 list-disc list-inside">
            <li>Hold the QR code steady inside the green frame</li>
            <li>Camera auto-detection requires Chrome or Edge on Android</li>
            <li>Use manual entry for printed confirmation codes</li>
            <li>Each ticket can only be scanned once</li>
          </ul>
        </div>
      )}
    </div>
  );
}
