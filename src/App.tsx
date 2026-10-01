import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, initAuth, getOrCreateUserId } from './firebase';
import {
  Card,
  GameType,
  BatakMode,
  RoomData,
  RoomPlayer,
  Suit,
  HandTelemetryRecord,
} from './types';
import { createDeck, shuffleDeck, SUIT_NAMES_TR } from './game/cards';
import { evaluatePistiPlay, calculatePistiRoundEndScores, getBotPistiCardChoice } from './game/pistiLogic';
import {
  isValidBatakMove,
  evaluateBatakTrickWinner,
  calculateBotBid,
  chooseBestTrumpForBot,
  getBotBatakCardChoice,
  TrickCard,
} from './game/batakLogic';
import { soundEngine, VoiceChatManager } from './audio/soundManager';
import { WebXRManager } from './xr/webxrManager';
import { Lobby } from './components/Lobby';
import { GameHUD } from './components/GameHUD';
import { VRCanvas } from './components/VRCanvas';
import { InviteModal } from './components/InviteModal';
import { TelemetryDrawer } from './components/TelemetryDrawer';

export default function App() {
  // Always initialize with guaranteed non-null player UID
  const [currentUser, setCurrentUser] = useState<{ uid: string }>(() => ({
    uid: getOrCreateUserId(),
  }));

  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [capturedCards, setCapturedCards] = useState<Record<string, Card[]>>({});
  const [lastCapturerId, setLastCapturerId] = useState<string | null>(null);

  // Batak trick state
  const [currentTrick, setCurrentTrick] = useState<TrickCard[]>([]);
  const [isKozBroken, setIsKozBroken] = useState<boolean>(false);

  // Audio & Voice state
  const [isMicMuted, setIsMicMuted] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const voiceChatRef = useRef<VoiceChatManager | null>(null);

  // WebXR state
  const xrManagerRef = useRef<WebXRManager | null>(null);
  const [isXRActive, setIsXRActive] = useState<boolean>(false);
  const [isVRSupported, setIsVRSupported] = useState<boolean>(false);

  // Modals & Drawers
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);
  const [telemetryData, setTelemetryData] = useState<HandTelemetryRecord | null>(null);
  const [pistiCelebration, setPistiCelebration] = useState<{ text: string; isDouble: boolean } | null>(null);

  // Check URL query for direct invite ?room=CODE
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
    }

    // Initialize Firebase Auth (with automatic fallback to client UID)
    initAuth()
      .then((user) => {
        if (user?.uid) {
          setCurrentUser({ uid: user.uid });
        }
      })
      .catch((err) => console.warn('Auth non-critical notice:', err));

    // Initialize Voice Chat manager
    const voice = new VoiceChatManager((speaking) => {
      setIsSpeaking(speaking);
    });
    voiceChatRef.current = voice;

    return () => {
      voice.cleanup();
    };
  }, []);

  // Listen to Firestore Room Document
  useEffect(() => {
    if (!room?.id) return;
    const roomRef = doc(db, 'rooms', room.id);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoom(snapshot.data() as RoomData);
        }
      },
      (error) => {
        console.warn('Room listener notice (operating in local sync):', error.message);
      }
    );
    return () => unsubscribe();
  }, [room?.id]);

  // Listen to Firestore Players Subcollection
  useEffect(() => {
    if (!room?.id) return;
    const playersRef = collection(db, 'rooms', room.id, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: RoomPlayer[] = [];
          snapshot.forEach((d) => list.push(d.data() as RoomPlayer));
          list.sort((a, b) => a.seatIndex - b.seatIndex);
          setPlayers(list);
        }
      },
      (error) => {
        console.warn('Players listener notice (operating in local sync):', error.message);
      }
    );
    return () => unsubscribe();
  }, [room?.id]);

  const localPlayer = players.find((p) => p.userId === currentUser.uid || p.id === currentUser.uid) || players[0];
  const isMyTurn = !!(room && localPlayer && room.currentTurn === localPlayer.seatIndex && room.status === 'playing');

  // Handle Room Creation
  const handleCreateRoom = async (params: {
    gameType: GameType;
    batakMode: BatakMode;
    maxPlayers: 2 | 4;
    targetScore: number;
    fillBots: boolean;
    playerName: string;
    avatarType: string;
  }) => {
    const uid = currentUser?.uid || getOrCreateUserId();
    const roomId = `room_${Date.now()}`;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Prepare full 52 card deck
    const fullDeck = shuffleDeck(createDeck());
    let initialMiddleCards: Card[] = [];
    let initialHand: Card[] = [];
    const remainingDeck = [...fullDeck];

    const initialPlayers: RoomPlayer[] = [
      {
        id: uid,
        roomId,
        userId: uid,
        name: params.playerName,
        seatIndex: 0,
        avatarType: params.avatarType,
        avatarColor: '#2563eb',
        isHost: true,
        isReady: true,
        isBot: false,
        isMuted: isMicMuted,
        isSpeaking: false,
        handCount: params.gameType === 'pisti' ? 4 : 13,
        score: 0,
        roundScore: 0,
        tricksWon: 0,
        pistiCount: 0,
        bid: 0,
        hasBid: false,
      },
    ];

    if (params.gameType === 'pisti') {
      // 4 cards to table (first 3 facedown, 4th face up)
      initialMiddleCards = remainingDeck.splice(0, 4);
      // Deal 4 cards to host
      initialHand = remainingDeck.splice(0, 4);

      // If fillBots, add remaining seats as Bots
      if (params.fillBots) {
        const botNames = ['Hasan Dayı', 'Korkut Bey', 'Zeynep Usta'];
        for (let i = 1; i < params.maxPlayers; i++) {
          remainingDeck.splice(0, 4); // deal bot cards from deck
          initialPlayers.push({
            id: `bot_${i}_${Date.now()}`,
            roomId,
            name: botNames[i - 1] || `Bot ${i}`,
            seatIndex: i,
            avatarType: i === 1 ? 'cyber_diver' : i === 2 ? 'gentleman' : 'retro_gamer',
            avatarColor: i === 1 ? '#059669' : i === 2 ? '#d97706' : '#9333ea',
            isHost: false,
            isReady: true,
            isBot: true,
            isMuted: true,
            isSpeaking: false,
            handCount: 4,
            score: 0,
            roundScore: 0,
            tricksWon: 0,
            pistiCount: 0,
            bid: 0,
            hasBid: false,
          });
        }
      }
    } else {
      // Batak (4 players, 13 cards each)
      initialHand = remainingDeck.splice(0, 13);
      const botNames = ['Kemal Usta', 'Ayşe Hanım', 'Murat Dayı'];
      for (let i = 1; i < 4; i++) {
        remainingDeck.splice(0, 13);
        initialPlayers.push({
          id: `bot_${i}_${Date.now()}`,
          roomId,
          name: botNames[i - 1],
          seatIndex: i,
          avatarType: i === 1 ? 'cyber_diver' : i === 2 ? 'gentleman' : 'retro_gamer',
          avatarColor: i === 1 ? '#059669' : i === 2 ? '#d97706' : '#9333ea',
          isHost: false,
          isReady: true,
          isBot: true,
          isMuted: true,
          isSpeaking: false,
          handCount: 13,
          score: 0,
          roundScore: 0,
          tricksWon: 0,
          pistiCount: 0,
          bid: 0,
          hasBid: false,
        });
      }
    }

    const roomPayload: RoomData = {
      id: roomId,
      code,
      name: `${params.playerName}'nin Masası`,
      gameType: params.gameType,
      batakMode: params.batakMode,
      targetScore: params.targetScore,
      maxPlayers: params.maxPlayers,
      status: params.gameType === 'batak' ? 'bidding' : 'playing',
      hostId: uid,
      currentTurn: 0,
      dealerSeat: params.maxPlayers - 1,
      trumpSuit: 'none',
      highestBid: 0,
      highestBidder: -1,
      biddingCount: 0,
      middleCards: initialMiddleCards,
      playedHistory: [],
      deckCount: remainingDeck.length,
      roundNumber: 1,
      lastActionText: 'Masa kuruldu. Kartlar dağıtıldı!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Transition immediately so user never experiences delay
    setPlayerHand(initialHand);
    setDeck(remainingDeck);
    setRoom(roomPayload);
    setPlayers(initialPlayers);
    soundEngine.playCardDeal();

    // Sync to Firestore in background
    try {
      await setDoc(doc(db, 'rooms', roomId), roomPayload);
      for (const p of initialPlayers) {
        await setDoc(doc(db, 'rooms', roomId, 'players', p.id), p);
      }
    } catch (error) {
      console.warn('Firestore room initial sync warning (game continues locally):', error);
    }
  };

  // Handle Room Join via code
  const handleJoinRoom = async (code: string, playerName: string, avatarType: string) => {
    const uid = currentUser?.uid || getOrCreateUserId();
    try {
      const q = query(collection(db, 'rooms'), where('code', '==', code.toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert(`"${code}" kodlu aktif bir masa bulunamadı. Lütfen kodu kontrol edin veya yeni bir masa kurun.`);
        return;
      }

      const roomDoc = snap.docs[0];
      const roomData = roomDoc.data() as RoomData;

      // Get existing players
      const playersSnap = await getDocs(collection(db, 'rooms', roomData.id, 'players'));
      const existingPlayers: RoomPlayer[] = [];
      playersSnap.forEach((d) => existingPlayers.push(d.data() as RoomPlayer));
      existingPlayers.sort((a, b) => a.seatIndex - b.seatIndex);

      // Find available seat (or replace a bot seat)
      let seatToTake = -1;
      const takenHumanSeats = new Set(existingPlayers.filter((p) => !p.isBot).map((p) => p.seatIndex));
      for (let i = 0; i < roomData.maxPlayers; i++) {
        if (!takenHumanSeats.has(i)) {
          seatToTake = i;
          break;
        }
      }

      if (seatToTake === -1) {
        alert('Bu masa maalesef tamamen dolu!');
        return;
      }

      const newPlayer: RoomPlayer = {
        id: uid,
        roomId: roomData.id,
        userId: uid,
        name: playerName,
        seatIndex: seatToTake,
        avatarType,
        avatarColor: '#10b981',
        isHost: false,
        isReady: true,
        isBot: false,
        isMuted: isMicMuted,
        isSpeaking: false,
        handCount: roomData.gameType === 'pisti' ? 4 : 13,
        score: 0,
        roundScore: 0,
        tricksWon: 0,
        pistiCount: 0,
        bid: 0,
        hasBid: false,
      };

      // Deal player hand
      const dummyDeck = shuffleDeck(createDeck());
      const hand = dummyDeck.slice(0, roomData.gameType === 'pisti' ? 4 : 13);
      setPlayerHand(hand);

      const filteredPlayers = existingPlayers.filter((p) => p.seatIndex !== seatToTake);
      filteredPlayers.push(newPlayer);
      filteredPlayers.sort((a, b) => a.seatIndex - b.seatIndex);

      setPlayers(filteredPlayers);
      setRoom(roomData);
      soundEngine.playCardDeal();

      // Write player to Firestore
      try {
        await setDoc(doc(db, 'rooms', roomData.id, 'players', newPlayer.id), newPlayer);
      } catch (err) {
        console.warn('Firestore join write notice:', err);
      }
    } catch (err) {
      console.error('Join room error:', err);
      alert('Masaya katılırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Pişti Bot Auto-Play loop
  useEffect(() => {
    if (!room || room.gameType !== 'pisti' || room.status !== 'playing') return;
    const currentSeat = room.currentTurn;
    const player = players.find((p) => p.seatIndex === currentSeat);

    if (player && player.isBot) {
      const timer = setTimeout(() => {
        const dummyDeck = shuffleDeck(createDeck());
        const botHand = dummyDeck.slice(0, Math.max(1, player.handCount));
        const chosenCard = getBotPistiCardChoice(botHand, room.middleCards);

        executePistiCardPlay(player, chosenCard);
      }, 900 + Math.random() * 500);

      return () => clearTimeout(timer);
    }
  }, [room?.currentTurn, room?.status, players]);

  // Batak Bot Bidding & Playing loop
  useEffect(() => {
    if (!room || room.gameType !== 'batak') return;
    const currentSeat = room.currentTurn;
    const player = players.find((p) => p.seatIndex === currentSeat);

    // 1. Bot Bidding
    if (room.status === 'bidding' && player && player.isBot) {
      const timer = setTimeout(() => {
        const dummyHand = shuffleDeck(createDeck()).slice(0, 13);
        const botBid = calculateBotBid(dummyHand);

        let finalBid = 0;
        if (botBid > room.highestBid) {
          finalBid = botBid;
        }

        executeBatakBid(player.seatIndex, finalBid, dummyHand);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // 2. Bot Playing
    if (room.status === 'playing' && player && player.isBot) {
      const timer = setTimeout(() => {
        const dummyHand = shuffleDeck(createDeck()).slice(0, Math.max(1, player.handCount));
        const chosenCard = getBotBatakCardChoice(
          dummyHand,
          currentTrick,
          room.trumpSuit as Suit,
          isKozBroken
        );
        executeBatakCardPlay(player, chosenCard);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [room?.currentTurn, room?.status, currentTrick, isKozBroken, players]);

  // Execute Pişti Card Play
  const executePistiCardPlay = async (player: RoomPlayer, card: Card) => {
    if (!room) return;

    soundEngine.playCardSnap();
    if (xrManagerRef.current && isXRActive) {
      xrManagerRef.current.triggerHaptic(0.7, 50);
    }

    const { captured, isPisti, isDoublePisti, capturedCards: taken, newMiddleCards, pointsAwarded } =
      evaluatePistiPlay(card, room.middleCards);

    // Celebration
    if (isPisti) {
      soundEngine.playPisti(isDoublePisti);
      setPistiCelebration({
        text: isDoublePisti ? 'ÇİFTE VALE PİŞTİ!' : 'PİŞTİ!',
        isDouble: isDoublePisti,
      });
      setTimeout(() => setPistiCelebration(null), 3000);
    } else if (captured) {
      soundEngine.playCollectPile();
    }

    // Update player's hand count and scores
    const updatedPlayers = players.map((p) => {
      if (p.id === player.id) {
        return {
          ...p,
          handCount: Math.max(0, p.handCount - 1),
          pistiCount: p.pistiCount + (isDoublePisti ? 2 : isPisti ? 1 : 0),
          score: p.score + pointsAwarded,
        };
      }
      return p;
    });

    if (captured) {
      setLastCapturerId(player.id);
      setCapturedCards((prev) => ({
        ...prev,
        [player.id]: [...(prev[player.id] || []), ...taken],
      }));
    }

    // If local player, remove card from UI hand
    if (player.id === localPlayer.id) {
      setPlayerHand((prev) => prev.filter((c) => c.id !== card.id));
    }

    // Rotate turn clockwise
    const nextTurn = (room.currentTurn + 1) % room.maxPlayers;
    const allHandsEmpty = updatedPlayers.every((p) => p.handCount === 0);

    let nextDeck = [...deck];
    let nextStatus = room.status;

    if (allHandsEmpty) {
      if (nextDeck.length >= room.maxPlayers * 4) {
        // Deal next 4 cards to each player
        soundEngine.playCardDeal();
        const nextLocalHand = nextDeck.splice(0, 4);
        setPlayerHand(nextLocalHand);
        updatedPlayers.forEach((p) => {
          p.handCount = 4;
        });
      } else {
        // Deck is empty: Round Complete!
        soundEngine.playTurnAlert();
        nextStatus = 'round_ended';
        const { roundPoints } = calculatePistiRoundEndScores(
          updatedPlayers,
          capturedCards,
          lastCapturerId || player.id,
          newMiddleCards
        );
        updatedPlayers.forEach((p) => {
          const added = roundPoints[p.id] || 0;
          p.score += added;
          p.roundScore = added;
        });
      }
    }

    const updatedRoom: RoomData = {
      ...room,
      middleCards: newMiddleCards,
      currentTurn: nextTurn,
      status: nextStatus,
      deckCount: nextDeck.length,
      lastActionText: `${player.name} ${card.value} oynadı${isPisti ? ' ve PİŞTİ yaptı!' : captured ? ' ve yerdeki kartları aldı!' : '.'}`,
      updatedAt: new Date().toISOString(),
    };

    setDeck(nextDeck);
    setRoom(updatedRoom);
    setPlayers(updatedPlayers);

    // Sync to Firestore
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        middleCards: newMiddleCards,
        currentTurn: nextTurn,
        status: nextStatus,
        deckCount: nextDeck.length,
        lastActionText: updatedRoom.lastActionText,
      });
      await updateDoc(doc(db, 'rooms', room.id, 'players', player.id), {
        handCount: updatedPlayers.find((p) => p.id === player.id)?.handCount,
        pistiCount: updatedPlayers.find((p) => p.id === player.id)?.pistiCount,
        score: updatedPlayers.find((p) => p.id === player.id)?.score,
      });
    } catch {
      // Offline fallback
    }
  };

  // Execute Batak Bid
  const executeBatakBid = async (seatIndex: number, bid: number, botHand?: Card[]) => {
    if (!room) return;

    const player = players.find((p) => p.seatIndex === seatIndex);
    if (!player) return;

    let newHighestBid = room.highestBid;
    let newHighestBidder = room.highestBidder;

    if (bid > room.highestBid) {
      newHighestBid = bid;
      newHighestBidder = seatIndex;
    }

    const updatedPlayers = players.map((p) => {
      if (p.seatIndex === seatIndex) {
        return { ...p, bid, hasBid: true };
      }
      return p;
    });

    const nextBiddingCount = room.biddingCount + 1;
    let nextStatus = room.status;
    let nextTrump: Suit | 'none' = room.trumpSuit;

    // After 4 bids, auction concludes
    if (nextBiddingCount >= 4) {
      if (newHighestBidder === -1) {
        newHighestBidder = room.dealerSeat;
        newHighestBid = 4;
      }

      // If winner is bot, choose best trump automatically
      if (updatedPlayers.find((p) => p.seatIndex === newHighestBidder)?.isBot) {
        const trump = chooseBestTrumpForBot(botHand || shuffleDeck(createDeck()).slice(0, 13));
        nextTrump = trump;
        nextStatus = 'playing';
        soundEngine.playTrumpSelected(trump);
      }
    }

    const nextTurn = (seatIndex + 1) % 4;
    setPlayers(updatedPlayers);
    setRoom({
      ...room,
      highestBid: newHighestBid,
      highestBidder: newHighestBidder,
      biddingCount: nextBiddingCount,
      trumpSuit: nextTrump,
      status: nextStatus,
      currentTurn: nextBiddingCount >= 4 ? newHighestBidder : nextTurn,
    });
  };

  // Choose Trump (when human player won Batak auction)
  const handleSelectTrump = (suit: Suit) => {
    if (!room) return;
    soundEngine.playTrumpSelected(suit);
    setRoom({
      ...room,
      trumpSuit: suit,
      status: 'playing',
      currentTurn: room.highestBidder,
      lastActionText: `Koz ${SUIT_NAMES_TR[suit]} olarak belirlendi!`,
    });
  };

  // Execute Batak Card Play
  const executeBatakCardPlay = (player: RoomPlayer, card: Card) => {
    if (!room) return;

    soundEngine.playCardSnap();
    if (xrManagerRef.current && isXRActive) {
      xrManagerRef.current.triggerHaptic(0.7, 50);
    }

    if (card.suit === room.trumpSuit && currentTrick.length > 0 && currentTrick[0].card.suit !== room.trumpSuit) {
      setIsKozBroken(true);
    }

    const newTrick: TrickCard[] = [...currentTrick, { card, seatIndex: player.seatIndex }];
    setCurrentTrick(newTrick);

    if (player.id === localPlayer.id) {
      setPlayerHand((prev) => prev.filter((c) => c.id !== card.id));
    }

    const updatedPlayers = players.map((p) => {
      if (p.id === player.id) {
        return { ...p, handCount: Math.max(0, p.handCount - 1) };
      }
      return p;
    });

    if (newTrick.length === 4) {
      setTimeout(() => {
        const winnerSeat = evaluateBatakTrickWinner(newTrick, room.trumpSuit as Suit);
        soundEngine.playCollectPile();

        const withWonTrick = updatedPlayers.map((p) => {
          if (p.seatIndex === winnerSeat) {
            return { ...p, tricksWon: p.tricksWon + 1 };
          }
          return p;
        });

        setCurrentTrick([]);
        setPlayers(withWonTrick);

        const allFinished = withWonTrick.every((p) => p.handCount === 0);
        if (allFinished) {
          withWonTrick.forEach((p) => {
            if (p.seatIndex === room.highestBidder) {
              if (p.tricksWon >= room.highestBid) {
                p.score += room.highestBid * 10 + (p.tricksWon - room.highestBid);
                p.roundScore = room.highestBid * 10 + (p.tricksWon - room.highestBid);
              } else {
                p.score -= room.highestBid * 10;
                p.roundScore = -(room.highestBid * 10);
              }
            } else {
              p.score += p.tricksWon * 10;
              p.roundScore = p.tricksWon * 10;
            }
          });

          setRoom((prev) => (prev ? { ...prev, status: 'round_ended', currentTurn: winnerSeat } : null));
        } else {
          setRoom((prev) => (prev ? { ...prev, currentTurn: winnerSeat } : null));
        }
      }, 1000);
    } else {
      const nextTurn = (room.currentTurn + 1) % 4;
      setRoom({ ...room, currentTurn: nextTurn });
      setPlayers(updatedPlayers);
    }
  };

  // Card Play Requested from 3D Canvas / VR Pinch
  const handleCardPlayRequested = (card: Card) => {
    if (!room || !isMyTurn) return;

    if (room.gameType === 'pisti') {
      executePistiCardPlay(localPlayer, card);
    } else if (room.gameType === 'batak') {
      const validation = isValidBatakMove(
        card,
        playerHand,
        currentTrick,
        room.trumpSuit as Suit,
        isKozBroken
      );
      if (!validation.valid) {
        alert(validation.reason || 'Geçersiz kart!');
        return;
      }
      executeBatakCardPlay(localPlayer, card);
    }
  };

  // WebXR Enter / Exit
  const handleEnterVR = async () => {
    if (xrManagerRef.current) {
      const res = await xrManagerRef.current.enterVR();
      if (res.success) {
        setIsXRActive(true);
      } else {
        alert(res.error || 'VR moduna geçilemedi.');
      }
    } else {
      alert('WebXR yöneticisi henüz başlatılmadı. Lütfen Meta Quest 3 başlığınızdaki Oculus Browser ile sayfayı açın.');
    }
  };

  const handleExitVR = () => {
    if (xrManagerRef.current) {
      xrManagerRef.current.exitVR();
      setIsXRActive(false);
    }
  };

  // Toggle Voice Chat Mic
  const handleToggleMic = async () => {
    if (voiceChatRef.current) {
      if (isMicMuted) {
        const started = await voiceChatRef.current.startMicrophone();
        if (started) {
          setIsMicMuted(false);
        }
      } else {
        const muted = voiceChatRef.current.toggleMute();
        setIsMicMuted(muted);
      }
    }
  };

  // Toggle Sound FX
  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Telemetry Sample Callback: Sync to Firestore
  const handleTelemetrySample = useCallback(
    async (sample: {
      pinchCount: number;
      hapticCount: number;
      leftWrist?: [number, number, number];
      rightWrist?: [number, number, number];
    }) => {
      if (!room || !localPlayer) return;

      const record: HandTelemetryRecord = {
        id: `telem_${localPlayer.id}`,
        roomId: room.id,
        playerId: localPlayer.id,
        playerName: localPlayer.name,
        gameType: room.gameType,
        jointCount: 25,
        pinchCount: sample.pinchCount,
        hapticCount: sample.hapticCount,
        durationSeconds: 120,
        lastJointSnapshot: {
          leftWrist: sample.leftWrist,
          rightWrist: sample.rightWrist,
        },
        recordedAt: new Date().toISOString(),
      };

      setTelemetryData(record);

      try {
        await setDoc(doc(db, 'rooms', room.id, 'telemetry', record.id), {
          ...record,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Silently handled
      }
    },
    [room?.id, room?.gameType, localPlayer?.id, localPlayer?.name]
  );

  return (
    <>
      {!room ? (
        <div className="w-full min-h-screen bg-slate-950 font-sans overflow-y-auto">
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            initialRoomCode={initialRoomCode}
          />
        </div>
      ) : (
        <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
          {/* 3D WebXR Viewport */}
          <VRCanvas
            playerHand={playerHand}
            middleCards={room.gameType === 'batak' ? currentTrick.map((tc) => tc.card) : room.middleCards}
            players={players}
            currentTurnSeat={room.currentTurn}
            localSeatIndex={localPlayer.seatIndex}
            trumpSuit={room.trumpSuit}
            onCardPlayRequested={handleCardPlayRequested}
            onXRManagerReady={(xr) => {
              xrManagerRef.current = xr;
              setIsVRSupported(xr.getIsVRSupported());
            }}
            onTelemetrySample={handleTelemetrySample}
          />

          {/* 2D/VR HUD Overlay */}
          <GameHUD
            room={room}
            players={players}
            localPlayer={localPlayer}
            isMyTurn={isMyTurn}
            isXRActive={isXRActive}
            isVRSupported={isVRSupported}
            isMicMuted={isMicMuted}
            isSpeaking={isSpeaking}
            isSoundMuted={isSoundMuted}
            onEnterVR={handleEnterVR}
            onExitVR={handleExitVR}
            onToggleMic={handleToggleMic}
            onToggleSound={handleToggleSound}
            onOpenInvite={() => setIsInviteOpen(true)}
            onOpenTelemetry={() => setIsTelemetryOpen(true)}
            onLeaveRoom={() => setRoom(null)}
            onPlaceBid={(bid) => executeBatakBid(localPlayer.seatIndex, bid)}
            onSelectTrump={handleSelectTrump}
            pistiCelebration={pistiCelebration}
          />

          {/* Invite Modal */}
          {isInviteOpen && (
            <InviteModal
              roomCode={room.code}
              gameType={room.gameType}
              onClose={() => setIsInviteOpen(false)}
            />
          )}

          {/* Quest 3 Hand Tracking Telemetry Drawer */}
          <TelemetryDrawer
            isOpen={isTelemetryOpen}
            onClose={() => setIsTelemetryOpen(false)}
            telemetry={telemetryData}
            isXRActive={isXRActive}
          />
        </div>
      )}
    </>
  );
}
