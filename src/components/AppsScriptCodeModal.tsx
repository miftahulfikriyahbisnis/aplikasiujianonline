import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileCode, HelpCircle, ExternalLink } from 'lucide-react';

interface AppsScriptCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptCodeModal: React.FC<AppsScriptCodeModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('Code.gs');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/apps-script-code')
        .then(res => res.json())
        .then(res => {
          if (res.status === 'success') {
            setFiles(res.files || {});
            setGuide(res.deploymentGuide || {});
            if (res.files && Object.keys(res.files).length > 0 && !res.files[activeFile]) {
              setActiveFile(Object.keys(res.files)[0]);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const content = files[activeFile];
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const fileKeys = Object.keys(files).sort((a, b) => {
    if (a.endsWith('.gs') && !b.endsWith('.gs')) return -1;
    if (!a.endsWith('.gs') && b.endsWith('.gs')) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="apps-script-code-modal"
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-sky-700" />
              Kode Backend Google Apps Script & Panduan Deployment
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Salin kode berikut ke Script Editor Google Spreadsheet database Anda untuk menghubungkan Google Sheets secara langsung.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Guide Accordion */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/70 text-xs text-amber-950 flex flex-col gap-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-amber-900">
            <HelpCircle className="w-4 h-4" /> 7 Langkah Menghubungkan Google Spreadsheet:
          </div>
          <ol className="list-decimal list-inside space-y-0.5 pl-1 text-slate-700">
            <li>Buka Spreadsheet Database Ujian Anda, klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
            <li>Buat file-file skrip (<code>.gs</code>) dan file HTML (<code>.html</code>) di bawah ini sesuai namanya persis.</li>
            <li>Salin seluruh kode dari masing-masing tab ke file terkait di editor Apps Script.</li>
            <li>Di file <code>Database.gs</code>, pilih fungsi <code>initDatabaseSetup</code> lalu klik <strong>Jalankan (Run)</strong> untuk membuat 16 sheet otomatis.</li>
            <li>Klik tombol <strong>Deploy &gt; New deployment</strong> &gt; Pilih jenis <strong>Web app</strong>.</li>
            <li>Atur: <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>, lalu klik <strong>Deploy</strong>.</li>
            <li>Salin URL Web App yang berakhiran <code>/exec</code>, lalu simpan di menu <strong>Pengaturan</strong> aplikasi ini.</li>
          </ol>
        </div>

        {/* Body: Tabs + Editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* File sidebar */}
          <div className="w-60 border-r border-slate-200 bg-slate-50/50 p-3 overflow-y-auto flex flex-col gap-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase px-2 py-1 tracking-wider">
              Daftar File ({fileKeys.length})
            </div>
            {loading ? (
              <div className="p-4 text-xs text-slate-500">Memuat berkas...</div>
            ) : (
              fileKeys.map(fileName => (
                <button
                  key={fileName}
                  onClick={() => {
                    setActiveFile(fileName);
                    setCopied(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition cursor-pointer ${
                    activeFile === fileName
                      ? 'bg-sky-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${activeFile === fileName ? 'text-sky-200' : 'text-slate-500'}`} />
                  <span className="truncate">{fileName}</span>
                </button>
              ))
            )}
          </div>

          {/* Code viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-slate-300 text-xs">
              <span className="font-mono font-semibold text-sky-400">{activeFile}</span>
              <button
                id="btn-copy-apps-script-file"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode File Ini</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre font-normal">
                {files[activeFile] || '// Tidak ada konten'}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>Semua file sesuai spesifikasi <em>MASTER SPEC UJIAN ONLINE GOOGLE APPS SCRIPT</em></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
