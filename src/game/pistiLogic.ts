import { Card, RoomPlayer } from '../types';
import { getPistiPoint } from './cards';

export interface PistiMoveResult {
  captured: boolean;
  isPisti: boolean;
  isDoublePisti: boolean;
  capturedCards: Card[];
  newMiddleCards: Card[];
  pointsAwarded: number;
}

export function evaluatePistiPlay(
  playedCard: Card,
  middleCards: Card[]
): PistiMoveResult {
  // If table is empty
  if (middleCards.length === 0) {
    return {
      captured: false,
      isPisti: false,
      isDoublePisti: false,
      capturedCards: [],
      newMiddleCards: [playedCard],
      pointsAwarded: 0,
    };
  }

  const topCard = middleCards[middleCards.length - 1];
  const isMatch = playedCard.value === topCard.value;
  const isJack = playedCard.value === 'J';

  if (isMatch || isJack) {
    // Capture happened!
    const allCaptured = [...middleCards, playedCard];
    let isPisti = false;
    let isDoublePisti = false;
    let bonusPoints = 0;

    // Pişti occurs if and only if there was exactly 1 card on the table
    if (middleCards.length === 1) {
      if (isJack && topCard.value === 'J') {
        isDoublePisti = true;
        isPisti = true;
        bonusPoints = 20; // Çifte Pişti / Vale Pişti
      } else if (isMatch) {
        isPisti = true;
        bonusPoints = 10; // Standard Pişti
      }
    }

    return {
      captured: true,
      isPisti,
      isDoublePisti,
      capturedCards: allCaptured,
      newMiddleCards: [],
      pointsAwarded: bonusPoints,
    };
  }

  // No match: add to middle pile
  return {
    captured: false,
    isPisti: false,
    isDoublePisti: false,
    capturedCards: [],
    newMiddleCards: [...middleCards, playedCard],
    pointsAwarded: 0,
  };
}

export function calculatePistiRoundEndScores(
  players: RoomPlayer[],
  playerCapturedCards: Record<string, Card[]>,
  lastCapturerId: string | null,
  remainingMiddleCards: Card[]
): {
  roundPoints: Record<string, number>;
  cardsCount: Record<string, number>;
  majorityWinnerId: string | null;
} {
  const roundPoints: Record<string, number> = {};
  const cardsCount: Record<string, number> = {};

  players.forEach((p) => {
    roundPoints[p.id] = (p.pistiCount || 0) * 10;
    cardsCount[p.id] = (playerCapturedCards[p.id] || []).length;
  });

  // Remaining cards on table go to the last person who captured a pile
  if (lastCapturerId && remainingMiddleCards.length > 0 && playerCapturedCards[lastCapturerId]) {
    playerCapturedCards[lastCapturerId].push(...remainingMiddleCards);
    cardsCount[lastCapturerId] = playerCapturedCards[lastCapturerId].length;
  }

  // Calculate card point values (A, J, ♣2, ♦10)
  players.forEach((p) => {
    const cards = playerCapturedCards[p.id] || [];
    let ptSum = 0;
    cards.forEach((c) => {
      ptSum += getPistiPoint(c);
    });
    roundPoints[p.id] = (roundPoints[p.id] || 0) + ptSum;
  });

  // Calculate majority (3 points)
  let maxCount = 0;
  let majorityWinnerId: string | null = null;
  let isTie = false;

  players.forEach((p) => {
    const c = cardsCount[p.id];
    if (c > maxCount) {
      maxCount = c;
      majorityWinnerId = p.id;
      isTie = false;
    } else if (c === maxCount && maxCount > 0) {
      isTie = true;
    }
  });

  if (!isTie && majorityWinnerId && maxCount > 26) {
    roundPoints[majorityWinnerId] = (roundPoints[majorityWinnerId] || 0) + 3;
  }

  return { roundPoints, cardsCount, majorityWinnerId: isTie ? null : majorityWinnerId };
}

// Bot AI for Pişti
export function getBotPistiCardChoice(
  botHand: Card[],
  middleCards: Card[]
): Card {
  if (botHand.length === 0) throw new Error('Hand is empty');
  if (botHand.length === 1) return botHand[0];

  const topCard = middleCards.length > 0 ? middleCards[middleCards.length - 1] : null;

  // 1. If we can make a Pişti (single card on table), play matching card!
  if (middleCards.length === 1 && topCard) {
    const match = botHand.find((c) => c.value === topCard.value);
    if (match) return match;
  }

  // 2. If middle pile has valuable cards, or match exists:
  if (topCard) {
    // Normal match
    const match = botHand.find((c) => c.value === topCard.value && c.value !== 'J');
    if (match) return match;

    // If middle has >= 3 cards or has points (A, ♣2, ♦10), consider Jack
    const pileHasValuable = middleCards.some((c) => getPistiPoint(c) > 0 || middleCards.length >= 4);
    if (pileHasValuable) {
      const jack = botHand.find((c) => c.value === 'J');
      if (jack) return jack;
    }
  }

  // 3. Otherwise, play safe card (lowest value, not Jack, not points)
  const safeCards = botHand.filter((c) => c.value !== 'J' && getPistiPoint(c) === 0);
  if (safeCards.length > 0) {
    // Prefer cards with value 3..9
    return safeCards[Math.floor(Math.random() * safeCards.length)];
  }

  // 4. If only special cards remain, play lowest rank non-Jack
  const nonJack = botHand.filter((c) => c.value !== 'J');
  if (nonJack.length > 0) {
    return nonJack[0];
  }

  // 5. Must play Jack
  return botHand[0];
}
