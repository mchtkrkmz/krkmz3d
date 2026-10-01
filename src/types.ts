export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'; // Maça ♠, Kupa ♥, Karo ♦, Sinek ♣
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // e.g. "hearts_A"
  suit: Suit;
  value: CardValue;
  rank: number; // 2..14 (A=14, K=13, Q=12, J=11)
  pistiPoints?: number;
}

export type GameType = 'pisti' | 'batak';
export type BatakMode = 'ihale' | 'koz_maca' | 'esli';

export type RoomStatus =
  | 'waiting'
  | 'dealing'
  | 'bidding'
  | 'playing'
  | 'round_ended'
  | 'game_over';

export interface HeadPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface HandPose {
  isTracking: boolean;
  isPinching: boolean;
  pinchStrength: number;
  wrist?: [number, number, number];
  indexTip?: [number, number, number];
  thumbTip?: [number, number, number];
}

export interface RoomPlayer {
  id: string; // auth uid or bot id
  roomId: string;
  userId?: string;
  name: string;
  seatIndex: number; // 0: South (Local/Host), 1: West, 2: North, 3: East
  avatarType: string; // 'fez_pasha' | 'cyber_diver' | 'gentleman' | 'retro_gamer'
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  handCount: number;
  score: number;
  roundScore: number;
  tricksWon: number;
  pistiCount: number;
  bid: number; // in batak ihale (e.g. 0=pas, 5..13)
  hasBid: boolean;
  headPose?: HeadPose;
  leftHand?: HandPose;
  rightHand?: HandPose;
  updatedAt?: string;
}

export interface PlayedCardInfo {
  card: Card;
  playerId: string;
  seatIndex: number;
  playedAt: number;
  isPisti?: boolean;
  isDoublePisti?: boolean;
}

export interface RoomData {
  id: string;
  code: string;
  name: string;
  gameType: GameType;
  batakMode?: BatakMode;
  targetScore: number;
  maxPlayers: 2 | 4;
  status: RoomStatus;
  hostId: string;
  currentTurn: number; // seatIndex (0..maxPlayers-1)
  dealerSeat: number;
  trumpSuit: Suit | 'none'; // Koz
  highestBid: number;
  highestBidder: number; // seatIndex
  biddingCount: number;
  middleCards: Card[]; // cards currently on table
  playedHistory: PlayedCardInfo[];
  deckCount: number;
  roundNumber: number;
  lastTrickWinner?: number; // seatIndex
  lastPistiSeat?: number | null;
  lastActionText: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandTelemetryRecord {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  gameType: GameType;
  jointCount: number;
  pinchCount: number;
  hapticCount: number;
  durationSeconds: number;
  lastJointSnapshot?: {
    leftWrist?: [number, number, number];
    rightWrist?: [number, number, number];
    pinchDistanceLeft?: number;
    pinchDistanceRight?: number;
  };
  recordedAt: string;
}

export interface VoiceSignalData {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: string; // JSON stringified RTCSessionDescriptionInit or RTCIceCandidateInit
  createdAt: string;
}
