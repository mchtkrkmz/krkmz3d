import React from 'react';
import { RoomData, RoomPlayer, Suit } from '../types';
import { SUIT_NAMES_TR, SUIT_SYMBOLS, SUIT_COLORS } from '../game/cards';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Glasses,
  Share2,
  LogOut,
  Hand,
  Trophy,
  Info,
} from 'lucide-react';

interface GameHUDProps {
  room: RoomData;
  players: RoomPlayer[];
  localPlayer: RoomPlayer;
  isMyTurn: boolean;
  isXRActive: boolean;
  isVRSupported: boolean;
  isMicMuted: boolean;
  isSpeaking: boolean;
  isSoundMuted: boolean;
  onEnterVR: () => void;
  onExitVR: () => void;
  onToggleMic: () => void;
  onToggleSound: () => void;
  onOpenInvite: () => void;
  onOpenTelemetry: () => void;
  onLeaveRoom: () => void;
  onPlaceBid?: (bid: number) => void;
  onSelectTrump?: (suit: Suit) => void;
  pistiCelebration?: { text: string; isDouble: boolean } | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  room,
  players,
  localPlayer,
  isMyTurn,
  isXRActive,
  isVRSupported,
  isMicMuted,
  isSpeaking,
  isSoundMuted,
  onEnterVR,
  onExitVR,
  onToggleMic,
  onToggleSound,
  onOpenInvite,
  onOpenTelemetry,
  onLeaveRoom,
  onPlaceBid,
  onSelectTrump,
  pistiCelebration,
}) => {
  const currentTurnPlayer = players.find((p) => p.seatIndex === room.currentTurn);
  const isBiddingPhase = room.gameType === 'batak' && room.status === 'bidding';
  const isChoosingTrump =
    room.gameType === 'batak' &&
    room.status === 'bidding' &&
    room.highestBidder === localPlayer.seatIndex &&
    room.trumpSuit === 'none';

  return (
    <>
      {/* Top Floating HUD bar */}
      <div className="fixed top-3 inset-x-3 z-40 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Room & Game Info */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  {room.gameType === 'pisti' ? 'PİŞTİ' : 'BATAK'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">#{room.code}</span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold">
                {room.gameType === 'pisti'
                  ? `Hedef: ${room.targetScore} Puan`
                  : room.trumpSuit !== 'none'
                  ? `Koz: ${SUIT_SYMBOLS[room.trumpSuit as Suit]} ${SUIT_NAMES_TR[room.trumpSuit as Suit]} (${room.highestBid} El)`
                  : 'İhale Aşamasında'}
              </div>
            </div>

            <button
              onClick={onOpenInvite}
              title="Arkadaşını Davet Et"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Turn Status Banner */}
        <div className="pointer-events-auto hidden sm:block">
          <div
            className={`px-5 py-2 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 flex items-center gap-2 ${
              isMyTurn
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span className="text-xs font-bold">
              {isMyTurn
                ? 'SIRA SİZDE! (Kartı masaya sürükleyin veya tutun)'
                : `${currentTurnPlayer?.name || 'Rakip'} oynuyor...`}
            </span>
          </div>
        </div>

        {/* Right: Controls & Quest 3 VR Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Hand Tracking Telemetry Button */}
          <button
            onClick={onOpenTelemetry}
            title="Quest 3 El Takibi Verileri"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-2xl backdrop-blur-md shadow-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-semibold">El Takibi</span>
          </button>

          {/* Voice Mic Toggle */}
          <button
            onClick={onToggleMic}
            title={isMicMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-2.5 border rounded-2xl backdrop-blur-md shadow-xl transition cursor-pointer ${
              isMicMuted
                ? 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                : isSpeaking
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 animate-bounce'
                : 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
            }`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSound}
            title={isSoundMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl backdrop-blur-md shadow-xl transition cursor-pointer"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* WebXR VR Button for Meta Quest 3 */}
          {isXRActive ? (
            <button
              onClick={onExitVR}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xl transition cursor-pointer"
            >
              VR'dan Çık
            </button>
          ) : (
            <button
              onClick={onEnterVR}
              disabled={!isVRSupported}
              title={isVRSupported ? 'Meta Quest 3 VR Başlığı ile Masaya Gir' : 'WebXR bu tarayıcıda desteklenmiyor'}
              className={`px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-xl transition cursor-pointer ${
                isVRSupported
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Glasses className="w-4 h-4" />
              <span>{isVRSupported ? "QUEST 3 VR'A GİR" : '3D MASA MODU'}</span>
            </button>
          )}

          {/* Exit Room */}
          <button
            onClick={onLeaveRoom}
            title="Masadan Ayrıl"
            className="p-2.5 bg-slate-900/90 hover:bg-rose-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-2xl backdrop-blur-md transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pişti Celebratory Big Banner */}
      {pistiCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="bg-gradient-to-r from-amber-600/95 via-yellow-500/95 to-amber-600/95 text-slate-950 px-8 py-5 rounded-3xl shadow-2xl border-4 border-yellow-300 text-center transform scale-110 animate-bounce">
            <div className="text-4xl md:text-5xl font-black tracking-wider uppercase drop-shadow-md">
              {pistiCelebration.text}
            </div>
            <div className="text-sm font-bold mt-1 text-slate-900">
              {pistiCelebration.isDouble ? '🌟 ÇİFTE VALE PİŞTİSİ (+20 PUAN) 🌟' : '🎉 TEK KART PİŞTİ (+10 PUAN) 🎉'}
            </div>
          </div>
        </div>
      )}

      {/* Batak Bidding Modal (When it is local player's turn to bid) */}
      {isBiddingPhase && isMyTurn && !isChoosingTrump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center text-white">
            <h3 className="text-xl font-black text-amber-400 mb-1">İhale Sırası Sizde!</h3>
            <p className="text-xs text-slate-400 mb-4">
              En yüksek teklif: {room.highestBid > 0 ? `${room.highestBid} El` : 'Henüz teklif yok'}
            </p>

            <div className="grid grid-cols-5 gap-2 my-4">
              {[5, 6, 7, 8, 9, 10, 11, 12, 13].map((bid) => {
                const isPossible = bid > room.highestBid;
                return (
                  <button
                    key={bid}
                    disabled={!isPossible}
                    onClick={() => onPlaceBid && onPlaceBid(bid)}
                    className={`py-3 rounded-xl font-bold text-sm transition ${
                      isPossible
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {bid}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPlaceBid && onPlaceBid(0)}
              className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition cursor-pointer"
            >
              PAS GEÇ
            </button>
          </div>
        </div>
      )}

      {/* Batak Trump (Koz) Selection Modal (When player won auction) */}
      {isChoosingTrump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center text-white">
            <h3 className="text-xl font-black text-amber-400 mb-1">İhaleyi Kazandınız!</h3>
            <p className="text-xs text-slate-300 mb-5">
              Teklifiniz: <strong className="text-amber-400">{room.highestBid} El</strong>. Koz rengini belirleyin:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).map((suit) => {
                const color = SUIT_COLORS[suit];
                return (
                  <button
                    key={suit}
                    onClick={() => onSelectTrump && onSelectTrump(suit)}
                    className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 rounded-2xl flex items-center justify-center gap-3 transition cursor-pointer"
                  >
                    <span className="text-3xl" style={{ color }}>{SUIT_SYMBOLS[suit]}</span>
                    <span className="font-bold text-sm text-white">{SUIT_NAMES_TR[suit]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Round End Scoreboard Modal */}
      {room.status === 'round_ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Tur Sona Erdi</h3>
                <p className="text-xs text-slate-400">Puanlar hesaplandı ve kaydedildi.</p>
              </div>
            </div>

            <div className="space-y-2.5 my-5">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    p.id === localPlayer.id
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{p.isBot ? '🤖' : '👤'}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {room.gameType === 'pisti'
                          ? `Pişti: ${p.pistiCount} | Alınan Kart: ${p.handCount}`
                          : `İhale: ${p.bid || 'Pas'} | Kazanılan El: ${p.tricksWon}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-mono font-black text-amber-400">{p.score} P</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">+{p.roundScore || 0}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-slate-400">
              Yeni el otomatik olarak dağıtılacaktır...
            </div>
          </div>
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="fixed bottom-3 inset-x-3 z-30 flex justify-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full px-4 py-1.5 shadow-lg text-[11px] text-slate-400 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Meta Quest 3: Başparmak & İşaret parmağınızı birleştirerek kartı tutun ve masaya fırlatın.</span>
        </div>
      </div>
    </>
  );
};
