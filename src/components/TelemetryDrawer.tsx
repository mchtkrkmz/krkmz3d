import React from 'react';
import { Hand, Database, CheckCircle2, X, Activity, Radio } from 'lucide-react';
import { HandTelemetryRecord } from '../types';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: HandTelemetryRecord | null;
  isXRActive: boolean;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  isOpen,
  onClose,
  telemetry,
  isXRActive,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl p-6 text-white flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Quest 3 El Takibi Kayıtları</h3>
            <p className="text-xs text-slate-400">Firebase Firestore Gerçek Zamanlı Telemetri</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sync Status Badge */}
      <div className="mt-4 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3">
        <Database className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-xs">
          <span className="font-semibold text-emerald-300 block">Firestore Veritabanı Senkronize</span>
          <span className="text-slate-400">Tüm el eklem açıları ve pinch aksiyonları veritabanında arşivlenmektedir.</span>
        </div>
      </div>

      {/* VR Hardware Status */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>WebXR Durumu</span>
            <Radio className={`w-3.5 h-3.5 ${isXRActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="text-sm font-bold text-white">
            {isXRActive ? 'Meta Quest 3 VR Aktif' : 'Masaüstü / 3D Mod'}
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Eklem Takibi</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-sm font-bold text-white">
            {isXRActive ? '25 Eklem / El' : 'Fare / Dokunmatik'}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 space-y-3">
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-3">
          <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Mevcut Oturum İstatistikleri</h4>
          
          <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">Toplam Pinch (Kart Tutuş):</span>
            <span className="font-mono font-bold text-amber-400">{telemetry?.pinchCount || 0}</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">Haptik Titreşim Tetiklendi:</span>
            <span className="font-mono font-bold text-sky-400">{telemetry?.hapticCount || 0}</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-2">
            <span className="text-slate-400">Oyun Türü:</span>
            <span className="font-mono font-semibold text-white uppercase">{telemetry?.gameType || 'PİŞTİ'}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Son Kayıt Zamanı:</span>
            <span className="text-xs font-mono text-slate-300">
              {telemetry?.recordedAt ? new Date(telemetry.recordedAt).toLocaleTimeString('tr-TR') : 'Canlı Aktarım'}
            </span>
          </div>
        </div>

        {/* Live Vector Snapshot */}
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Son Bilek Pozisyonu (X, Y, Z)</h4>
            <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">Metrik (m)</span>
          </div>
          <div className="font-mono text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Sol Bilek:</span>
              <span>{telemetry?.lastJointSnapshot?.leftWrist ? telemetry.lastJointSnapshot.leftWrist.map(n => n.toFixed(3)).join(', ') : 'Takip ediliyor...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sağ Bilek:</span>
              <span>{telemetry?.lastJointSnapshot?.rightWrist ? telemetry.lastJointSnapshot.rightWrist.map(n => n.toFixed(3)).join(', ') : 'Takip ediliyor...'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 text-center">
        <p className="text-[11px] text-slate-500">
          Veriler `/rooms/{'{roomId}'}/telemetry` koleksiyonuna şifreli olarak kaydedilmektedir.
        </p>
      </div>
    </div>
  );
};
