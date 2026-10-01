import React, { useState, useEffect } from 'react';
import { GameType, BatakMode } from '../types';
import { Play, Users, Glasses, ShieldCheck, Sparkles, UserCheck, Bot } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (params: {
    gameType: GameType;
    batakMode: BatakMode;
    maxPlayers: 2 | 4;
    targetScore: number;
    fillBots: boolean;
    playerName: string;
    avatarType: string;
  }) => void;
  onJoinRoom: (code: string, playerName: string, avatarType: string) => void;
  initialRoomCode?: string;
}

const AVATAR_OPTIONS = [
  { id: 'fez_pasha', name: 'Fesli Paşa', desc: 'Geleneksel Türk Kahvehane Ustası', icon: '👳' },
  { id: 'cyber_diver', name: 'Siber Dalgıç', desc: 'Meta Quest 3 Neon Gezgini', icon: '🥽' },
  { id: 'gentleman', name: 'Klasik Beyefendi', desc: 'Zarif Takım Elbiseli Kart Ustası', icon: '🎩' },
  { id: 'retro_gamer', name: 'Retro Oyuncu', desc: '80ler Kulaklıklı Nostalji Ustası', icon: '🎧' },
];

export const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom, initialRoomCode = '' }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [gameType, setGameType] = useState<GameType>('pisti');
  const [batakMode, setBatakMode] = useState<BatakMode>('ihale');
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(gameType === 'batak' ? 4 : 2);
  const [targetScore, setTargetScore] = useState<number>(101);
  const [fillBots, setFillBots] = useState<boolean>(true);

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('vr_pisti_player_name') || `Oyuncu_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [avatarType, setAvatarType] = useState<string>('fez_pasha');
  const [joinCode, setJoinCode] = useState<string>(initialRoomCode);
  const [isWebXRAvailable, setIsWebXRAvailable] = useState<boolean>(false);

  useEffect(() => {
    if ('xr' in navigator && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setIsWebXRAvailable(supported);
      }).catch(() => setIsWebXRAvailable(false));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vr_pisti_player_name', playerName);
  }, [playerName]);

  // Adjust maxPlayers if Batak selected (Batak is always 4 players)
  useEffect(() => {
    if (gameType === 'batak') {
      setMaxPlayers(4);
    }
  }, [gameType]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    onCreateRoom({
      gameType,
      batakMode,
      maxPlayers,
      targetScore,
      fillBots,
      playerName: playerName.trim(),
      avatarType,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !playerName.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim(), avatarType);
  };

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
            VR
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              VR Pişti & Batak XR
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                Quest 3 Uyumlu
              </span>
            </h1>
            <p className="text-xs text-slate-400">Gerçek Zamanlı WebXR El Takibi, 3D Kahvehane Masası ve Mekânsal Ses</p>
          </div>
        </div>

        {/* WebXR Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <Glasses className={`w-4 h-4 ${isWebXRAvailable ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          <span className={isWebXRAvailable ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
            {isWebXRAvailable ? 'Meta Quest 3 Hazır' : 'Tarayıcı 3D Mod'}
          </span>
        </div>
      </header>

      {/* Meta Quest 3 Hero Guide Banner */}
      <div className="max-w-4xl mx-auto w-full mt-4 p-4 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-purple-950/70 border border-indigo-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
            <Glasses className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2">
              Meta Quest 3 WebXR Kart Masası
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                El Takibi & Haptik
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Oculus Browser'da masayı kurduktan sonra üst paneldeki <strong className="text-amber-300">"🥽 QUEST 3 VR MODUNA GİR"</strong> butonuna dokunarak 360° tam ekran sanal gerçekliğe geçebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full my-6 grid md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Avatar & Profile Customization */}
        <div className="md:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-4 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            Oyuncu Profili & Avatar
          </div>

          {/* Nickname input */}
          <div className="space-y-1.5 mb-5">
            <label className="text-xs font-medium text-slate-300">Oyuncu Adınız</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              placeholder="Adınızı girin..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">3D Masa Avatarı</label>
            <div className="grid grid-cols-2 gap-2.5">
              {AVATAR_OPTIONS.map((opt) => {
                const isSelected = avatarType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAvatarType(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-3xl mb-2">{opt.icon}</div>
                    <div>
                      <div className="font-bold text-xs text-white">{opt.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Firebase senkronizasyonlu sesli sohbet ve çok oyunculu masa</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Oyun içi pinch (tut-bırak) ile kart atma hissi</span>
            </div>
          </div>
        </div>

        {/* Right Column: Room Controls */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-950 rounded-2xl mb-6 border border-slate-800">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Yeni Masa Kur
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                activeTab === 'join'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Masaya Katıl
            </button>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Game Type Selection */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-2">Oyun Türü Seçin</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGameType('pisti')}
                    className={`p-4 rounded-2xl border text-center transition ${
                      gameType === 'pisti'
                        ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 border-amber-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">🃏</div>
                    <div className="text-sm font-bold">PİŞTİ</div>
                    <div className="text-[11px] text-slate-400">2 veya 4 Kişilik Klasik Türk Piştisi</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGameType('batak')}
                    className={`p-4 rounded-2xl border text-center transition ${
                      gameType === 'batak'
                        ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 border-amber-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">♠️</div>
                    <div className="text-sm font-bold">BATAK</div>
                    <div className="text-[11px] text-slate-400">4 Kişilik İhaleli & Koz Maça</div>
                  </button>
                </div>
              </div>

              {/* Game Mode specific options */}
              {gameType === 'batak' ? (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-2">Batak Modu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ihale', name: 'İhaleli' },
                      { id: 'koz_maca', name: 'Koz Maça' },
                      { id: 'esli', name: 'Eşli Batak' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setBatakMode(mode.id as BatakMode)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                          batakMode === mode.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {mode.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Player Count */}
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-2">Oyuncu Sayısı</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMaxPlayers(2)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition ${
                          maxPlayers === 2
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        2 Kişilik (Teke Tek)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaxPlayers(4)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition ${
                          maxPlayers === 4
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        4 Kişilik (Masa)
                      </button>
                    </div>
                  </div>

                  {/* Target Score */}
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-2">Hedef Puan</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[101, 151].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setTargetScore(score)}
                          className={`py-2 rounded-xl border text-xs font-semibold transition ${
                            targetScore === score
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {score} Puan
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bot fill toggle */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Boş Koltukları Yapay Zeka ile Doldur</span>
                    <span className="text-[11px] text-slate-400">Beklemeden anında oynamaya başla; arkadaşların geldikçe botların yerine geçer.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fillBots}
                  onChange={(e) => setFillBots(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Submit Create */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition transform active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                MASAYI KUR & OYUNA GİR
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Arkadaşınızın Oda Kodu</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="Örn: XR7921"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-500 transition text-center uppercase"
                />
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Masa Bağlantı Bilgisi:</p>
                <p>Arkadaşınızın oluşturduğu 6 haneli kodu girerek doğrudan aynı 3D masada yerinizi alabilirsiniz.</p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition transform active:scale-95 cursor-pointer"
              >
                <Users className="w-5 h-5" />
                MASAYA BAĞLAN
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pt-4 border-t border-slate-800/80">
        Meta Quest 3 WebXR Kart Salonu • Firebase Gerçek Zamanlı Çok Oyunculu & El Takibi Kaydı
      </footer>
    </div>
  );
};
