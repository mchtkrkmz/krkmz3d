import React, { useState } from 'react';
import { Copy, Check, Share2, X, Users, QrCode } from 'lucide-react';

interface InviteModalProps {
  roomCode: string;
  gameType: string;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ roomCode, gameType, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?room=${roomCode}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `VR ${gameType.toUpperCase()} Odasına Katıl!`,
          text: `Meta Quest 3 ve WebXR ortamında benimle ${gameType === 'pisti' ? 'Pişti' : 'Batak'} oyna! Oda Kodu: ${roomCode}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Arkadaşını Masaya Davet Et</h2>
            <p className="text-sm text-slate-400">Meta Quest 3 VR başlığı veya web tarayıcısından bağlanabilirler.</p>
          </div>
        </div>

        {/* Room Code Big Display */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 text-center my-4">
          <div className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">ODA KODU</div>
          <div className="text-4xl font-mono font-extrabold tracking-wider text-amber-300">{roomCode}</div>
        </div>

        {/* Share Link */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-300">Doğrudan Katılım Linki</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none px-2 truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleWebShare}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
              Paylaş
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Meta Quest 3 VR ${gameType.toUpperCase()} masama katıl! Oda: ${roomCode} ${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Meta Quest 3 Oculus Browser'da bu linki açarak tek tıkla masaya oturabilirsiniz.</span>
        </div>
      </div>
    </div>
  );
};
