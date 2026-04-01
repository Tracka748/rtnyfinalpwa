'use client';

import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'camera' | 'manual';

interface TicketData {
  id: string;
  ticket_number: string;
  confirmation_code: string | null;
  ticket_type: string;
  status: string;
}

interface EventData {
  id: string;
  name: string;
  event_date: string;
}

interface HolderData {
  display_name: string;
  email: string | null;
}

interface VerifySuccess {
  success: true;
  ticket: TicketData;
  event: EventData | null;
  holder: HolderData;
}

type ScanResult =
  | { status: 'success'; data: VerifySuccess }
  | { status: 'already_used'; scanned_at: string | null; error: string }
  | { status: 'not_found'; error: string }
  | { status: 'invalid'; ticketStatus: string | null; error: string }
  | { status: 'error'; error: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatScanTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Result panel ──────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  onClear,
}: {
  result: ScanResult;
  onClear: () => void;
}) {
  if (result.status === 'success') {
    const { ticket, event, holder } = result.data;
    return (
      <div className="rounded-2xl border border-[#59FFA0]/40 bg-[#59FFA0]/8 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✓</span>
            <div>
              <p className="text-xl font-bold text-[#59FFA0] font-['Rokkitt',serif] tracking-wide">
                VALID TICKET
              </p>
              <p className="text-sm text-[#59FFA0]/70">Ticket marked as used</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 px-3 py-1.5 text-xs bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="grid gap-3">
          {/* Holder */}
          <div className="rounded-xl bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8]/60 mb-1">Ticket Holder</p>
            <p className="text-base font-semibold text-white">{holder.display_name}</p>
            {holder.email && (
              <p className="text-sm text-[#7DD8E8]">{holder.email}</p>
            )}
          </div>

          {/* Event */}
          {event && (
            <div className="rounded-xl bg-black/30 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-[#7DD8E8]/60 mb-1">Event</p>
              <p className="text-base font-semibold text-white">{event.name}</p>
              <p className="text-sm text-[#7DD8E8]">{formatEventDate(event.event_date)}</p>
            </div>
          )}

          {/* Ticket details */}
          <div className="rounded-xl bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8]/60 mb-1">Ticket</p>
            <p className="text-base font-semibold text-white">{ticket.ticket_type}</p>
            <p className="text-sm text-[#7DD8E8] font-mono">{ticket.ticket_number}</p>
            {ticket.confirmation_code && (
              <p className="text-xs text-[#7DD8E8]/50 font-mono mt-0.5">
                {ticket.confirmation_code}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'already_used') {
    return (
      <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/8 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠</span>
            <div>
              <p className="text-xl font-bold text-yellow-400 font-['Rokkitt',serif]">
                ALREADY SCANNED
              </p>
              <p className="text-sm text-yellow-400/70">{result.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 px-3 py-1.5 text-xs bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
          >
            Clear
          </button>
        </div>
        {result.scanned_at && (
          <div className="rounded-xl bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8]/60 mb-1">Scanned At</p>
            <p className="text-base font-semibold text-yellow-300" suppressHydrationWarning>
              {formatScanTime(result.scanned_at)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (result.status === 'not_found') {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/8 p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✗</span>
            <div>
              <p className="text-xl font-bold text-red-400 font-['Rokkitt',serif]">
                TICKET NOT FOUND
              </p>
              <p className="text-sm text-red-400/70">
                This code was not found in the system
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 px-3 py-1.5 text-xs bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (result.status === 'invalid') {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/8 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚫</span>
            <div>
              <p className="text-xl font-bold text-red-400 font-['Rokkitt',serif]">
                INVALID TICKET
              </p>
              <p className="text-sm text-red-400/70">{result.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 px-3 py-1.5 text-xs bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
          >
            Clear
          </button>
        </div>
        {result.ticketStatus && (
          <div className="rounded-xl bg-black/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#7DD8E8]/60 mb-1">Status</p>
            <p className="text-base font-semibold text-red-300 capitalize">{result.ticketStatus}</p>
          </div>
        )}
      </div>
    );
  }

  // generic error
  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 p-5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <div>
            <p className="text-xl font-bold text-[#7DD8E8] font-['Rokkitt',serif]">ERROR</p>
            <p className="text-sm text-[#7DD8E8]/70">{result.error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 px-3 py-1.5 text-xs bg-white/10 text-[#7DD8E8] rounded-lg hover:bg-white/20 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs for html5-qrcode instance management
  const scannerRef = useRef<any>(null);
  const pausedRef = useRef(false);
  const scannerDivId = 'rtny-qr-reader';

  // ── Verify API call ─────────────────────────────────────────────────────

  async function callVerify(code: string): Promise<void> {
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/v1/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const json = await res.json();

      if (res.status === 200 && json.success) {
        setScanResult({ status: 'success', data: json as VerifySuccess });
      } else if (res.status === 409) {
        setScanResult({
          status: 'already_used',
          scanned_at: json.scanned_at ?? null,
          error: json.error ?? 'Ticket already scanned',
        });
      } else if (res.status === 404) {
        setScanResult({ status: 'not_found', error: json.error ?? 'Ticket not found' });
      } else if (res.status === 410) {
        setScanResult({
          status: 'invalid',
          ticketStatus: json.status ?? null,
          error: json.error ?? 'Ticket is not valid',
        });
      } else {
        setScanResult({ status: 'error', error: json.error ?? 'Unknown error' });
      }
    } catch {
      setScanResult({ status: 'error', error: 'Network error — check connection' });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Camera scanner lifecycle ────────────────────────────────────────────

  async function startScanner() {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Cleanup any prior instance
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
        scannerRef.current = null;
      }

      const instance = new Html5Qrcode(scannerDivId);
      scannerRef.current = instance;
      pausedRef.current = false;

      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText: string) => {
          // Prevent duplicate fires during the 3s cooldown
          if (pausedRef.current) return;
          pausedRef.current = true;

          await callVerify(decodedText);

          // Re-enable after 3 seconds
          setTimeout(() => {
            pausedRef.current = false;
          }, 3000);
        },
        () => {
          // QR not found in frame — not an error, ignore
        }
      );
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Camera permission denied. Allow camera access and try again.');
      } else {
        setCameraError('Could not start camera. Try manual entry instead.');
      }
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }

  // Start/stop scanner when switching tabs
  useEffect(() => {
    if (activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Manual submit ───────────────────────────────────────────────────────

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    callVerify(manualCode);
    setManualCode('');
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[#121113] text-[#F9FDFF] flex flex-col"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Header */}
      <header className="px-5 pt-8 pb-4 text-center">
        <h1
          className="text-3xl font-bold text-[#F9FDFF]"
          style={{ fontFamily: "'Rokkitt', serif" }}
        >
          RTNY <span className="text-[#59FFA0]">Ticket Scanner</span>
        </h1>
        <p className="text-sm text-[#7DD8E8] mt-1 opacity-70">
          Scan or enter a confirmation code to verify
        </p>
      </header>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 gap-1">
          {(['camera', 'manual'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setScanResult(null);
                setActiveTab(tab);
              }}
              className={[
                'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
                activeTab === tab
                  ? 'bg-[#59FFA0] text-[#121113]'
                  : 'text-[#7DD8E8] hover:text-white',
              ].join(' ')}
            >
              {tab === 'camera' ? '📷 Camera Scan' : '⌨️ Manual Entry'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 space-y-4">

        {/* ── Camera tab ── */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/8 p-6 text-center space-y-3">
                <span className="text-4xl block">⚠️</span>
                <p className="text-yellow-400 text-sm">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => { setCameraError(null); startScanner(); }}
                  className="px-5 py-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-xl text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black relative">
                {/* html5-qrcode mounts here */}
                <div id={scannerDivId} className="w-full" />

                {/* Mint viewfinder overlay — purely decorative, html5-qrcode draws its own */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 relative">
                    <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#59FFA0] rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#59FFA0] rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#59FFA0] rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#59FFA0] rounded-br-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator while API is in-flight */}
            {isLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4">
                <div className="w-6 h-6 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm text-[#7DD8E8]">Verifying ticket…</p>
              </div>
            )}

            <p className="text-xs text-center text-[#7DD8E8] opacity-50">
              Hold QR code inside the frame · Auto-detects · 3 s cooldown after each scan
            </p>
          </div>
        )}

        {/* ── Manual tab ── */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="manual-code"
                  className="block text-sm font-medium text-[#7DD8E8] mb-2"
                >
                  Confirmation code or ticket number
                </label>
                <input
                  id="manual-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter confirmation code or ticket number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-[#F9FDFF] text-sm placeholder-white/25 focus:outline-none focus:border-[#59FFA0]/50 focus:bg-white/8 transition-colors font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim() || isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all bg-[#59FFA0] text-[#121113] hover:bg-[#59FFA0]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#121113] border-t-transparent rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  'Verify Ticket'
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Result ── */}
        {scanResult && !isLoading && (
          <ResultPanel result={scanResult} onClear={() => setScanResult(null)} />
        )}
      </div>
    </div>
  );
}
