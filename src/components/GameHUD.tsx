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
  Sparkles,
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

  const topCard = room.middleCards.length > 0 ? room.middleCards[room.middleCards.length - 1] : null;

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

        {/* Right: Controls Icons */}
        <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
          {/* Hand Tracking Telemetry Button */}
          <button
            onClick={onOpenTelemetry}
            title="Quest 3 El Takibi Verileri"
            className="p-2 md:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-sky-400 rounded-2xl backdrop-blur-md shadow-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">El Takibi</span>
          </button>

          {/* Voice Mic Toggle */}
          <button
            onClick={onToggleMic}
            title={isMicMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-2 md:p-2.5 border rounded-2xl backdrop-blur-md shadow-xl transition cursor-pointer ${
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
            className="p-2 md:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl backdrop-blur-md shadow-xl transition cursor-pointer"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Exit Room */}
          <button
            onClick={onLeaveRoom}
            title="Masadan Ayrıl"
            className="p-2 md:p-2.5 bg-slate-900/90 hover:bg-rose-950/60 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-2xl backdrop-blur-md transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Persistent Floating VR Launch Button (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        {isXRActive ? (
          <button
            onClick={onExitVR}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs md:text-sm flex items-center gap-2 shadow-2xl transition cursor-pointer border border-rose-400"
          >
            <Glasses className="w-5 h-5" />
            <span>VR'DAN ÇIK</span>
          </button>
        ) : (
          <button
            onClick={onEnterVR}
            title="Meta Quest 3 Sanal Gerçeklik Moduna Geç"
            className="px-5 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center gap-2.5 shadow-2xl transition transform active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/30 border-2 border-amber-300"
          >
            <Glasses className="w-5 h-5 fill-slate-950" />
            <span className="tracking-wide">🥽 QUEST 3 VR MODUNA GİR</span>
          </button>
        )}
      </div>

      {/* Prominent Quest 3 VR Floating Callout */}
      {!isXRActive && isVRSupported && (
        <div className="fixed top-18 right-3 z-40 pointer-events-auto">
          <button
            onClick={onEnterVR}
            className="px-4 py-2 bg-sky-500/20 border border-sky-400/50 hover:bg-sky-500/30 text-sky-200 text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 cursor-pointer transition animate-pulse"
          >
            <Glasses className="w-4 h-4 text-sky-300" />
            <span>Meta Quest 3 Başlığı Algılandı — VR'a Geçmek İçin Tıklayın</span>
          </button>
        </div>
      )}

      {/* Floating Center Table Card Widget (Yerdeki Kart & Son Oynanan) */}
      <div className="fixed top-18 left-3 z-30 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3 transition">
          {topCard ? (
            <>
              {/* Crisp Card Miniature */}
              <div className="w-11 h-16 bg-white rounded-lg shadow-md border-2 border-slate-300 flex flex-col items-center justify-between py-1 px-1 shrink-0">
                <span className="text-xs font-black leading-none" style={{ color: SUIT_COLORS[topCard.suit] }}>
                  {topCard.value}
                </span>
                <span className="text-xl leading-none" style={{ color: SUIT_COLORS[topCard.suit] }}>
                  {SUIT_SYMBOLS[topCard.suit]}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {SUIT_NAMES_TR[topCard.suit].substring(0, 1)}
                </span>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                  <span>Yerdeki Kart</span>
                  <span className="text-slate-400">• {room.middleCards.length} Kart</span>
                </div>
                <div className="text-sm font-black text-white">
                  {SUIT_NAMES_TR[topCard.suit]} {topCard.value === 'J' ? 'Vale' : topCard.value === 'Q' ? 'Kız' : topCard.value === 'K' ? 'Papaz' : topCard.value === 'A' ? 'As' : topCard.value}
                </div>
                <div className="text-[10px] text-slate-400">
                  {room.lastActionText || 'Son kart masada'}
                </div>
                {room.gameType === 'pisti' && room.middleCards.length === 1 && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    PİŞTİ FIRSATI! (Eşleşen kart veya Vale)
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 py-1 px-2">
              <span className="text-amber-400 font-bold block mb-0.5">Masa Boş</span>
              <span>İlk kartı siz oynayın</span>
            </div>
          )}
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

      {/* Batak Bidding Modal */}
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

      {/* Batak Trump (Koz) Selection Modal */}
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
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-full px-4 py-2 shadow-lg text-xs text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Meta Quest 3: Başparmak + İşaret parmağınızı birleştirerek kartı tutun ve masaya fırlatın.</span>
        </div>
      </div>
    </>
  );
};
