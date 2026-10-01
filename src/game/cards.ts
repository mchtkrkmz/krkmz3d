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
  spades: '#0f172a',
  hearts: '#dc2626',
  diamonds: '#ea580c',
  clubs: '#0f172a',
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

// Cache textures for high performance
const cardTextureCache: Map<string, THREE.CanvasTexture> = new Map();
let backTextureCache: THREE.CanvasTexture | null = null;

export function getCardFrontTexture(card: Card): THREE.CanvasTexture {
  if (cardTextureCache.has(card.id)) {
    return cardTextureCache.get(card.id)!;
  }

  // High-Resolution 1024x1440 for VR & crisp legibility
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d')!;

  // 1. Warm ivory cardstock background with rounded paper appearance
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle linen texture grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1.5);
  }
  for (let x = 0; x < canvas.width; x += 4) {
    ctx.fillRect(x, 0, 1.5, canvas.height);
  }

  // Double gold & dark borders
  ctx.strokeStyle = '#d4af37'; // Antique Gold
  ctx.lineWidth = 16;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  // Helper for crisp corner indices
  const drawCorner = (x: number, y: number, inverted: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    if (inverted) ctx.rotate(Math.PI);

    // Number/Letter with high-contrast font
    ctx.fillStyle = color;
    ctx.font = '900 110px "Arial Black", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.value, 0, 0);

    // Suit Symbol under number
    ctx.font = '100px serif';
    ctx.fillText(symbol, 0, 105);
    ctx.restore();
  };

  // Top-Left Corner
  drawCorner(110, 140, false);
  // Bottom-Right Corner
  drawCorner(canvas.width - 110, canvas.height - 140, true);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Center Graphics
  if (['J', 'Q', 'K'].includes(card.value)) {
    // Ornate Royal Court Card Centerpiece
    ctx.save();
    // Frame
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(cx - 280, cy - 420, 560, 840);

    ctx.fillStyle = color === '#0f172a' ? '#1e293b' : '#881337';
    ctx.fillRect(cx - 270, cy - 410, 540, 820);

    // Inner parchment
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 250, cy - 390, 500, 780);

    // Large Suit Symbol in background of portrait
    ctx.fillStyle = color === '#0f172a' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(220, 38, 38, 0.08)';
    ctx.font = '420px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy);

    // Royal Portrait Badge
    ctx.fillStyle = color;
    ctx.font = '900 240px "Arial Black", sans-serif';
    ctx.fillText(card.value, cx, cy - 120);

    ctx.font = '220px serif';
    ctx.fillText(symbol, cx, cy + 130);

    // Turkish Title Banner
    const courtTitle = card.value === 'J' ? 'VALE' : card.value === 'Q' ? 'KIZ' : 'PAPAZ';
    ctx.fillStyle = '#b45309';
    ctx.font = 'italic 900 52px "Times New Roman", serif';
    ctx.fillText(courtTitle, cx, cy + 310);
    ctx.restore();
  } else if (card.value === 'A') {
    // Grand Master Ace
    ctx.fillStyle = color;
    ctx.font = '480px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, cx, cy - 20);

    // Under Ace title
    ctx.font = 'italic 900 70px "Times New Roman", serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('AS', cx, cy + 320);

    // Crown insignia for spades Ace
    if (card.suit === 'spades') {
      ctx.font = '70px serif';
      ctx.fillText('👑', cx, cy - 320);
    }
  } else {
    // Numbered Cards with balanced clear pip arrangement
    const pips = parseInt(card.value, 10);
    ctx.fillStyle = color;
    ctx.font = '160px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const colLeft = cx - 150;
    const colRight = cx + 150;

    if (pips === 2) {
      ctx.fillText(symbol, cx, cy - 280);
      ctx.fillText(symbol, cx, cy + 280);
    } else if (pips === 3) {
      ctx.fillText(symbol, cx, cy - 320);
      ctx.fillText(symbol, cx, cy);
      ctx.fillText(symbol, cx, cy + 320);
    } else if (pips === 4) {
      ctx.fillText(symbol, colLeft, cy - 280);
      ctx.fillText(symbol, colRight, cy - 280);
      ctx.fillText(symbol, colLeft, cy + 280);
      ctx.fillText(symbol, colRight, cy + 280);
    } else if (pips === 5) {
      ctx.fillText(symbol, colLeft, cy - 280);
      ctx.fillText(symbol, colRight, cy - 280);
      ctx.fillText(symbol, cx, cy);
      ctx.fillText(symbol, colLeft, cy + 280);
      ctx.fillText(symbol, colRight, cy + 280);
    } else if (pips === 6) {
      ctx.fillText(symbol, colLeft, cy - 300);
      ctx.fillText(symbol, colRight, cy - 300);
      ctx.fillText(symbol, colLeft, cy);
      ctx.fillText(symbol, colRight, cy);
      ctx.fillText(symbol, colLeft, cy + 300);
      ctx.fillText(symbol, colRight, cy + 300);
    } else if (pips === 7) {
      ctx.fillText(symbol, colLeft, cy - 300);
      ctx.fillText(symbol, colRight, cy - 300);
      ctx.fillText(symbol, cx, cy - 150);
      ctx.fillText(symbol, colLeft, cy);
      ctx.fillText(symbol, colRight, cy);
      ctx.fillText(symbol, colLeft, cy + 300);
      ctx.fillText(symbol, colRight, cy + 300);
    } else if (pips === 8) {
      ctx.fillText(symbol, colLeft, cy - 320);
      ctx.fillText(symbol, colRight, cy - 320);
      ctx.fillText(symbol, cx, cy - 160);
      ctx.fillText(symbol, colLeft, cy);
      ctx.fillText(symbol, colRight, cy);
      ctx.fillText(symbol, cx, cy + 160);
      ctx.fillText(symbol, colLeft, cy + 320);
      ctx.fillText(symbol, colRight, cy + 320);
    } else if (pips === 9) {
      ctx.fillText(symbol, colLeft, cy - 340);
      ctx.fillText(symbol, colRight, cy - 340);
      ctx.fillText(symbol, colLeft, cy - 110);
      ctx.fillText(symbol, colRight, cy - 110);
      ctx.fillText(symbol, cx, cy);
      ctx.fillText(symbol, colLeft, cy + 110);
      ctx.fillText(symbol, colRight, cy + 110);
      ctx.fillText(symbol, colLeft, cy + 340);
      ctx.fillText(symbol, colRight, cy + 340);
    } else if (pips === 10) {
      ctx.fillText(symbol, colLeft, cy - 340);
      ctx.fillText(symbol, colRight, cy - 340);
      ctx.fillText(symbol, cx, cy - 220);
      ctx.fillText(symbol, colLeft, cy - 100);
      ctx.fillText(symbol, colRight, cy - 100);
      ctx.fillText(symbol, colLeft, cy + 100);
      ctx.fillText(symbol, colRight, cy + 100);
      ctx.fillText(symbol, cx, cy + 220);
      ctx.fillText(symbol, colLeft, cy + 340);
      ctx.fillText(symbol, colRight, cy + 340);
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
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d')!;

  // Deep royal crimson & navy background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer gold rim
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 28;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 8;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

  // Diamond weave arabesque pattern
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(72, 72, canvas.width - 144, canvas.height - 144);

  ctx.strokeStyle = '#3730a3';
  ctx.lineWidth = 6;
  for (let x = 80; x < canvas.width - 80; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 400, canvas.height - 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, canvas.height - 80);
    ctx.lineTo(x + 400, 80);
    ctx.stroke();
  }

  // Central Luxury Gold Seal
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.fillStyle = '#831843';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 16;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 190, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // VR & Turkish motif text
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 80px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VR XR', cx, cy - 50);

  ctx.font = 'italic 900 44px "Times New Roman", serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('PİŞTİ & BATAK', cx, cy + 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  backTextureCache = texture;
  return texture;
}
