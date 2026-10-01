import { Card, Suit } from '../types';

export interface TrickCard {
  card: Card;
  seatIndex: number;
}

export function isValidBatakMove(
  card: Card,
  playerHand: Card[],
  trickCards: TrickCard[],
  trumpSuit: Suit,
  isKozBroken: boolean
): { valid: boolean; reason?: string } {
  // If leading the trick
  if (trickCards.length === 0) {
    if (card.suit === trumpSuit && !isKozBroken) {
      // Cannot lead with Koz unless the player has ONLY Koz cards
      const hasNonTrump = playerHand.some((c) => c.suit !== trumpSuit);
      if (hasNonTrump) {
        return { valid: false, reason: 'Koz düşmeden (çakılmadan) koz ile çıkamazsınız.' };
      }
    }
    return { valid: true };
  }

  const leadCard = trickCards[0].card;
  const leadSuit = leadCard.suit;

  const cardsOfLeadSuit = playerHand.filter((c) => c.suit === leadSuit);

  // 1. Must follow lead suit if has any
  if (cardsOfLeadSuit.length > 0) {
    if (card.suit !== leadSuit) {
      return { valid: false, reason: `${leadSuit.toUpperCase()} rengine uymak zorundasınız.` };
    }

    // Must beat highest lead suit card if possible (Yükseltme kuralı)
    const highestLeadRankInTrick = Math.max(
      ...trickCards
        .filter((tc) => tc.card.suit === leadSuit)
        .map((tc) => tc.card.rank)
    );

    const canBeatLead = cardsOfLeadSuit.some((c) => c.rank > highestLeadRankInTrick);
    if (canBeatLead && card.rank < highestLeadRankInTrick) {
      return { valid: false, reason: 'Yerdeki karttan daha büyük bir kartınız varken yükseltmek zorundasınız.' };
    }

    return { valid: true };
  }

  // 2. Void in lead suit: MUST play Trump (Koz) if has any
  const cardsOfTrumpSuit = playerHand.filter((c) => c.suit === trumpSuit);

  if (cardsOfTrumpSuit.length > 0) {
    if (card.suit !== trumpSuit) {
      return { valid: false, reason: 'Elinizde koz varken koz atmak (çakmak) zorundasınız.' };
    }

    // Must beat highest koz in trick if koz was already played (Koz büyütme kuralı)
    const highestKozRankInTrick = Math.max(
      0,
      ...trickCards
        .filter((tc) => tc.card.suit === trumpSuit)
        .map((tc) => tc.card.rank)
    );

    if (highestKozRankInTrick > 0) {
      const canBeatKoz = cardsOfTrumpSuit.some((c) => c.rank > highestKozRankInTrick);
      if (canBeatKoz && card.rank < highestKozRankInTrick) {
        return { valid: false, reason: 'Yerdeki kozdan daha büyük koz atmak zorundasınız.' };
      }
    }

    return { valid: true };
  }

  // 3. Void in lead suit AND no trump: Can discard any card
  return { valid: true };
}

export function evaluateBatakTrickWinner(
  trickCards: TrickCard[],
  trumpSuit: Suit
): number {
  if (trickCards.length === 0) return 0;

  const leadSuit = trickCards[0].card.suit;

  // Check if any trump was played
  const trumpPlays = trickCards.filter((tc) => tc.card.suit === trumpSuit);
  if (trumpPlays.length > 0) {
    let highestTrump = trumpPlays[0];
    for (let i = 1; i < trumpPlays.length; i++) {
      if (trumpPlays[i].card.rank > highestTrump.card.rank) {
        highestTrump = trumpPlays[i];
      }
    }
    return highestTrump.seatIndex;
  }

  // No trump played: highest card of lead suit wins
  const leadPlays = trickCards.filter((tc) => tc.card.suit === leadSuit);
  let highestLead = leadPlays[0];
  for (let i = 1; i < leadPlays.length; i++) {
    if (leadPlays[i].card.rank > highestLead.card.rank) {
      highestLead = leadPlays[i];
    }
  }
  return highestLead.seatIndex;
}

// Bot AI for Batak Bidding & Card Selection
export function calculateBotBid(hand: Card[]): number {
  let highCardPoints = 0;
  const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };

  hand.forEach((c) => {
    suitCounts[c.suit]++;
    if (c.value === 'A') highCardPoints += 4;
    else if (c.value === 'K') highCardPoints += 3;
    else if (c.value === 'Q') highCardPoints += 2;
    else if (c.value === 'J') highCardPoints += 1;
  });

  const maxSuitCount = Math.max(...Object.values(suitCounts));
  // Standard estimation: tricks approx points / 3 + length bonus
  const estimatedTricks = Math.floor(highCardPoints / 3) + Math.max(0, maxSuitCount - 4);

  if (estimatedTricks >= 5) {
    return Math.min(10, estimatedTricks);
  }
  return 0; // Pas
}

export function chooseBestTrumpForBot(hand: Card[]): Suit {
  const suitScores: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  hand.forEach((c) => {
    suitScores[c.suit] += c.rank >= 11 ? 3 : 1;
  });

  let bestSuit: Suit = 'spades';
  let bestScore = -1;
  (Object.keys(suitScores) as Suit[]).forEach((suit) => {
    if (suitScores[suit] > bestScore) {
      bestScore = suitScores[suit];
      bestSuit = suit;
    }
  });
  return bestSuit;
}

export function getBotBatakCardChoice(
  hand: Card[],
  trickCards: TrickCard[],
  trumpSuit: Suit,
  isKozBroken: boolean
): Card {
  const validCards = hand.filter((c) =>
    isValidBatakMove(c, hand, trickCards, trumpSuit, isKozBroken).valid
  );

  if (validCards.length === 0) return hand[0];
  if (validCards.length === 1) return validCards[0];

  // If leading
  if (trickCards.length === 0) {
    // Prefer leading with Ace or King of longest suit (non-koz if koz not broken)
    const nonTrumpAces = validCards.filter((c) => c.value === 'A' && c.suit !== trumpSuit);
    if (nonTrumpAces.length > 0) return nonTrumpAces[0];

    const highCards = validCards.filter((c) => c.rank >= 12);
    if (highCards.length > 0) return highCards[0];

    // Otherwise lead safe low card
    return validCards.sort((a, b) => a.rank - b.rank)[0];
  }

  // If following, pick lowest valid card that wins, or lowest card overall if cannot win
  const leadSuit = trickCards[0].card.suit;
  const leadCards = trickCards.filter((tc) => tc.card.suit === leadSuit);
  const maxLeadRank = Math.max(...leadCards.map((tc) => tc.card.rank));

  const winningFollows = validCards.filter((c) => c.suit === leadSuit && c.rank > maxLeadRank);
  if (winningFollows.length > 0) {
    // Play lowest winning card
    return winningFollows.sort((a, b) => a.rank - b.rank)[0];
  }

  // If cannot win or void, throw lowest
  return validCards.sort((a, b) => a.rank - b.rank)[0];
}
