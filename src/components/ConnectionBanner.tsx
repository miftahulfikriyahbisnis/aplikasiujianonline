import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Code2, Settings } from 'lucide-react';

interface ConnectionBannerProps {
  onOpenCodeModal?: () => void;
  onOpenSettings?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  onOpenCodeModal,
  onOpenSettings
}) => {
  const [status, setStatus] = useState<{
    connected: boolean;
    message: string;
    url: string;
    error?: string;
    details?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'healthCheck', data: {} })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' || data.ok) {
          setStatus({
            connected: true,
            message: 'DATABASE TERHUBUNG (Google Sheets)',
            url: data.data?.url || '',
            ...data
          });
        } else {
          setStatus({
            connected: false,
            message: 'DATABASE TIDAK TERHUBUNG',
            url: '',
            error: data.message || data.error
          });
        }
      })
      .catch(err => {
        setStatus({
          connected: false,
          message: 'DATABASE TIDAK TERHUBUNG',
          url: '',
          error: err.message || 'Gagal terhubung ke proxy server'
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (!status) return null;

  return (
    <div
      id="connection-status-banner"
      className={`border rounded-xl px-4 py-3 transition-colors ${
        status.connected
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-2xs'
          : 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-2xs'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          {status.connected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full text-xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              DATABASE TERHUBUNG
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-rose-800 bg-rose-100/90 px-2.5 py-1 rounded-full text-xs shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              DATABASE TIDAK TERHUBUNG
            </span>
          )}

          <span className="truncate text-xs sm:text-sm">
            {status.connected ? (
              <span className="text-emerald-900">
                Tersambung langsung ke Google Sheets via Server-Side Apps Script Proxy
              </span>
            ) : (
              <span className="text-amber-900 font-medium">
                {status.error ? `Error: ${status.error.slice(0, 95)}...` : 'Belum dapat terhubung ke Google Apps Script.'}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Pengaturan Database</span>
            </button>
          )}

          <button
            id="btn-recheck-db"
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Cek ulang status koneksi ke Google Sheets"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Mengecek...' : 'Cek Status'}</span>
          </button>

          {onOpenCodeModal && (
            <button
              id="btn-view-apps-script-code"
              onClick={onOpenCodeModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-800 text-white hover:bg-sky-900 transition cursor-pointer shadow-2xs"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Panduan GAS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
