import * as THREE from 'three';
import { Card, CardValue, Suit } from '../types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const VALUES: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_NAMES_TR: Record<Suit, string> = {
  spades: 'Maça',
  hearts: 'Kupa',
  diamonds: 'Karo',
  clubs: 'Sinek',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#111827',
  hearts: '#e11d48',
  diamonds: '#e11d48',
  clubs: '#111827',
};

export function getRank(value: CardValue): number {
  switch (value) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(value, 10);
  }
}

export function getPistiPoint(card: Card): number {
  if (card.value === 'A' || card.value === 'J') return 1;
  if (card.suit === 'clubs' && card.value === '2') return 2;
  if (card.suit === 'diamonds' && card.value === '10') return 3;
  return 0;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      const card: Card = {
        id: `${suit}_${value}`,
        suit,
        value,
        rank: getRank(value),
      };
      card.pistiPoints = getPistiPoint(card);
      deck.push(card);
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const array = [...deck];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Cache textures for performance and memory optimization
const cardTextureCache: Map<string, THREE.CanvasTexture> = new Map();
let backTextureCache: THREE.CanvasTexture | null = null;

export function getCardFrontTexture(card: Card): THREE.CanvasTexture {
  if (cardTextureCache.has(card.id)) {
    return cardTextureCache.get(card.id)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext('2d')!;

  // Smooth background with soft rounded shadow boundary
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border & ivory paper grain
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  // Corner 1 (Top-Left)
  ctx.fillStyle = color;
  ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.value, 60, 80);

  ctx.font = '48px "Trebuchet MS", sans-serif';
  ctx.fillText(symbol, 60, 130);

  // Corner 2 (Bottom-Right, inverted)
  ctx.save();
  ctx.translate(canvas.width - 60, canvas.height - 80);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.value, 0, 0);
  ctx.font = '48px "Trebuchet MS", sans-serif';
  ctx.fillText(symbol, 0, 50);
  ctx.restore();

  // Center Art
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (['J', 'Q', 'K'].includes(card.value)) {
    // Royal court card stylized emblem
    ctx.save();
    ctx.fillStyle = color === '#111827' ? '#1e293b' : '#be123c';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 130, cy - 180, 260, 360);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 126, cy - 176, 252, 352);

    // Decorative court crest
    ctx.fillStyle = color;
    ctx.font = 'bold 110px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.value, cx, cy - 50);

    ctx.font = '90px "Trebuchet MS", sans-serif';
    ctx.fillText(symbol, cx, cy + 60);

    ctx.fillStyle = '#b45309';
    ctx.font = 'italic bold 22px serif';
    const courtTitle = card.value === 'J' ? 'VALE' : card.value === 'Q' ? 'KIZ' : 'PAPAZ';
    ctx.fillText(courtTitle, cx, cy + 140);
    ctx.restore();
  } else if (card.value === 'A') {
    // Majestic Ace
    ctx.fillStyle = color;
    ctx.font = '220px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);

    ctx.font = 'italic bold 32px serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('AS', cx, cy + 140);
  } else {
    // Numbered Cards with balanced pip arrangement
    const pips = parseInt(card.value, 10);
    ctx.fillStyle = color;
    ctx.font = '80px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (pips === 2) {
      ctx.fillText(symbol, cx, cy - 130);
      ctx.fillText(symbol, cx, cy + 130);
    } else if (pips === 3) {
      ctx.fillText(symbol, cx, cy - 150);
      ctx.fillText(symbol, cx, cy);
      ctx.fillText(symbol, cx, cy + 150);
    } else if (pips === 4) {
      ctx.fillText(symbol, cx - 70, cy - 130);
      ctx.fillText(symbol, cx + 70, cy - 130);
      ctx.fillText(symbol, cx - 70, cy + 130);
      ctx.fillText(symbol, cx + 70, cy + 130);
    } else if (pips === 5) {
      ctx.fillText(symbol, cx - 70, cy - 130);
      ctx.fillText(symbol, cx + 70, cy - 130);
      ctx.fillText(symbol, cx, cy);
      ctx.fillText(symbol, cx - 70, cy + 130);
      ctx.fillText(symbol, cx + 70, cy + 130);
    } else {
      // 6 to 10
      ctx.fillText(symbol, cx - 70, cy - 160);
      ctx.fillText(symbol, cx + 70, cy - 160);
      ctx.fillText(symbol, cx - 70, cy);
      ctx.fillText(symbol, cx + 70, cy);
      ctx.fillText(symbol, cx - 70, cy + 160);
      ctx.fillText(symbol, cx + 70, cy + 160);
      if (pips >= 7) ctx.fillText(symbol, cx, cy - 80);
      if (pips >= 8) ctx.fillText(symbol, cx, cy + 80);
      if (pips === 10) ctx.fillText(symbol, cx, cy);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  cardTextureCache.set(card.id, texture);
  return texture;
}

export function getCardBackTexture(): THREE.CanvasTexture {
  if (backTextureCache) return backTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 716;
  const ctx = canvas.getContext('2d')!;

  // Dark crimson & navy Turkish kahvehane vintage medallion pattern
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer gold rim
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  // Diamond weave pattern in center
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(36, 36, canvas.width - 72, canvas.height - 72);

  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 3;
  for (let x = 40; x < canvas.width - 40; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x + 200, canvas.height - 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, canvas.height - 40);
    ctx.lineTo(x + 200, 40);
    ctx.stroke();
  }

  // Central Luxury Seal
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#7c2d12';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();

  // VR & Turkish motif text
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 36px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VR XR', cx, cy - 25);

  ctx.font = 'italic bold 20px serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('PİŞTİ & BATAK', cx, cy + 20);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  backTextureCache = texture;
  return texture;
}
