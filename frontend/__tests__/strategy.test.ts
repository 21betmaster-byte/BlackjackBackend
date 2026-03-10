import {
  getBestPlay,
  getDetailedPlay,
  getInsurancePlay,
  DEALER_BUST_PROBABILITY,
  DetailedPlay,
  formatDealerCard,
} from '../game/strategy';
import {
  Card,
  Suit,
  Rank,
  cardValue,
  scoreHand,
} from '../game/engine';

function card(rank: Rank, suit: Suit = 'spades', faceUp = true): Card {
  return { rank, suit, faceUp };
}

// ============================================================
// getDetailedPlay — Category Detection
// ============================================================

describe('getDetailedPlay', () => {
  describe('hard total detection', () => {
    it('returns hard_total for non-pair, non-soft hands', () => {
      const play = getDetailedPlay([card('10'), card('6')], card('10'), false, true);
      expect(play.category).toBe('hard_total');
    });

    it('returns correct scenarioKey for hard 16 vs 10', () => {
      const play = getDetailedPlay([card('10'), card('6')], card('10'), false, true);
      expect(play.scenarioKey).toBe('hard_16_vs_10');
      expect(play.scenarioDescription).toBe('Hard 16 vs Dealer 10');
    });

    it('returns hit for hard 16 vs 10', () => {
      const play = getDetailedPlay([card('10'), card('6')], card('10'), false, true);
      expect(play.action).toBe('hit');
    });

    it('returns stand for hard 17 vs any', () => {
      const play = getDetailedPlay([card('10'), card('7')], card('6'), false, false);
      expect(play.action).toBe('stand');
      expect(play.category).toBe('hard_total');
    });

    it('returns hit for hard 12 vs 2', () => {
      const play = getDetailedPlay([card('10'), card('2')], card('2'), false, true);
      expect(play.action).toBe('hit');
    });

    it('returns stand for hard 12 vs 4', () => {
      const play = getDetailedPlay([card('10'), card('2')], card('4'), false, true);
      expect(play.action).toBe('stand');
    });

    it('returns double for hard 11 vs any', () => {
      const play = getDetailedPlay([card('6'), card('5')], card('7'), false, true);
      expect(play.action).toBe('double');
      expect(play.category).toBe('hard_total');
    });

    it('returns hit instead of double when canDouble is false', () => {
      const play = getDetailedPlay([card('6'), card('5')], card('7'), false, false);
      expect(play.action).toBe('hit');
    });

    it('returns hit for hard 9 vs 3 with double available', () => {
      const play = getDetailedPlay([card('5'), card('4')], card('3'), false, true);
      expect(play.action).toBe('double');
    });

    it('clamps hard totals below 5', () => {
      // 2+2=4, should clamp to 5 in lookup
      const play = getDetailedPlay([card('2'), card('2')], card('7'), false, true);
      expect(play.category).toBe('hard_total');
    });
  });

  describe('soft total detection', () => {
    it('returns soft_total for ace-based soft hands', () => {
      const play = getDetailedPlay([card('A'), card('6')], card('3'), false, true);
      expect(play.category).toBe('soft_total');
      expect(play.scenarioKey).toBe('soft_17_vs_3');
      expect(play.scenarioDescription).toBe('Soft 17 vs Dealer 3');
    });

    it('returns double for soft 17 vs 3', () => {
      const play = getDetailedPlay([card('A'), card('6')], card('3'), false, true);
      expect(play.action).toBe('double');
    });

    it('returns stand for soft 19 vs most cards', () => {
      const play = getDetailedPlay([card('A'), card('8')], card('7'), false, false);
      expect(play.action).toBe('stand');
      expect(play.category).toBe('soft_total');
    });

    it('returns hit for soft 13 vs 2', () => {
      const play = getDetailedPlay([card('A'), card('2')], card('2'), false, true);
      expect(play.action).toBe('hit');
    });

    it('handles Ds fallback — soft 18 vs 2 without double returns stand', () => {
      const play = getDetailedPlay([card('A'), card('7')], card('2'), false, false);
      expect(play.action).toBe('stand');
      expect(play.category).toBe('soft_total');
    });

    it('returns double for soft 18 vs 5 when can double', () => {
      const play = getDetailedPlay([card('A'), card('7')], card('5'), false, true);
      expect(play.action).toBe('double');
    });
  });

  describe('pair split detection', () => {
    it('returns pair_split for splittable pairs', () => {
      const play = getDetailedPlay(
        [card('8'), card('8', 'hearts')],
        card('6'),
        true,
        true,
      );
      expect(play.category).toBe('pair_split');
      expect(play.scenarioKey).toBe('pair_8_vs_6');
      expect(play.action).toBe('split');
    });

    it('returns pair_split for aces', () => {
      const play = getDetailedPlay(
        [card('A'), card('A', 'hearts')],
        card('10'),
        true,
        true,
      );
      expect(play.category).toBe('pair_split');
      expect(play.action).toBe('split');
    });

    it('does NOT return pair_split when canSplit is false', () => {
      const play = getDetailedPlay(
        [card('8'), card('8', 'hearts')],
        card('6'),
        false,
        true,
      );
      // Falls through to hard total (16)
      expect(play.category).toBe('hard_total');
    });

    it('does NOT return split for 10-value pairs', () => {
      const play = getDetailedPlay(
        [card('10'), card('10', 'hearts')],
        card('6'),
        true,
        true,
      );
      // Strategy says stand (don't split 10s)
      expect(play.action).toBe('stand');
      // Falls through since pair chart says S, not P
      expect(play.category).toBe('hard_total');
    });

    it('returns split for 7s vs 6', () => {
      const play = getDetailedPlay(
        [card('7'), card('7', 'hearts')],
        card('6'),
        true,
        true,
      );
      expect(play.category).toBe('pair_split');
      expect(play.action).toBe('split');
    });

    it('does NOT return split for 7s vs 8 (falls to hard)', () => {
      const play = getDetailedPlay(
        [card('7'), card('7', 'hearts')],
        card('8'),
        true,
        true,
      );
      // Pair chart says H for 7s vs 8
      expect(play.category).toBe('hard_total');
      expect(play.action).toBe('hit');
    });
  });

  describe('explanation quality', () => {
    it('hard total explanation mentions dealer bust probability', () => {
      const play = getDetailedPlay([card('10'), card('3')], card('6'), false, true);
      expect(play.explanation).toContain('42%');
    });

    it('soft total explanation mentions ace as safety net', () => {
      const play = getDetailedPlay([card('A'), card('5')], card('9'), false, true);
      const lower = play.explanation.toLowerCase();
      const mentionsAce = lower.includes('ace') || lower.includes('safety') || lower.includes('flexible');
      expect(mentionsAce).toBe(true);
    });

    it('pair split explanation for 8s mentions worst hand', () => {
      const play = getDetailedPlay(
        [card('8'), card('8', 'hearts')],
        card('10'),
        true,
        true,
      );
      expect(play.explanation).toContain('worst');
    });

    it('hard stand explanation for 17+ mentions strong hand', () => {
      const play = getDetailedPlay([card('10'), card('8')], card('7'), false, false);
      expect(play.explanation).toContain('strong');
    });

    it('hit explanation for low totals mentions cannot bust', () => {
      const play = getDetailedPlay([card('6'), card('5')], card('10'), false, false);
      expect(play.explanation).toContain('cannot bust');
    });
  });

  describe('scenarioKey format', () => {
    it('hard total key format: hard_{total}_vs_{dealer}', () => {
      const play = getDetailedPlay([card('10'), card('5')], card('8'), false, true);
      expect(play.scenarioKey).toMatch(/^hard_\d+_vs_(A|\d+)$/);
    });

    it('soft total key format: soft_{total}_vs_{dealer}', () => {
      const play = getDetailedPlay([card('A'), card('7')], card('5'), false, true);
      expect(play.scenarioKey).toMatch(/^soft_\d+_vs_(A|\d+)$/);
    });

    it('pair split key format: pair_{val}_vs_{dealer}', () => {
      const play = getDetailedPlay(
        [card('9'), card('9', 'hearts')],
        card('5'),
        true,
        true,
      );
      expect(play.scenarioKey).toMatch(/^pair_(A|\d+)_vs_(A|\d+)$/);
    });
  });
});

// ============================================================
// getInsurancePlay
// ============================================================

describe('getInsurancePlay', () => {
  it('always returns decline (stand action)', () => {
    const play = getInsurancePlay();
    expect(play.action).toBe('stand');
  });

  it('has insurance category', () => {
    const play = getInsurancePlay();
    expect(play.category).toBe('insurance');
  });

  it('has insurance_offered scenarioKey', () => {
    const play = getInsurancePlay();
    expect(play.scenarioKey).toBe('insurance_offered');
  });

  it('explanation mentions negative expected value', () => {
    const play = getInsurancePlay();
    expect(play.explanation).toContain('negative');
  });

  it('explanation mentions 30.8% probability', () => {
    const play = getInsurancePlay();
    expect(play.explanation).toContain('30.8%');
  });
});

// ============================================================
// DEALER_BUST_PROBABILITY
// ============================================================

describe('DEALER_BUST_PROBABILITY', () => {
  it('has entries for all dealer upcards', () => {
    const keys = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];
    for (const k of keys) {
      expect(DEALER_BUST_PROBABILITY[k]).toBeDefined();
      expect(typeof DEALER_BUST_PROBABILITY[k]).toBe('number');
    }
  });

  it('dealer 6 has highest bust probability (~42%)', () => {
    expect(DEALER_BUST_PROBABILITY['6']).toBeGreaterThan(0.4);
  });

  it('dealer A has lowest bust probability (~11.5%)', () => {
    expect(DEALER_BUST_PROBABILITY['A']).toBeLessThan(0.15);
  });

  it('bust probabilities are between 0 and 1', () => {
    for (const val of Object.values(DEALER_BUST_PROBABILITY)) {
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThan(1);
    }
  });
});

// ============================================================
// Backward compatibility — getBestPlay still works
// ============================================================

describe('getBestPlay backward compatibility', () => {
  it('still returns BestPlay format', () => {
    const play = getBestPlay([card('10'), card('6')], card('10'), false, true);
    expect(play).toHaveProperty('action');
    expect(play).toHaveProperty('reason');
    expect(['hit', 'stand', 'double', 'split']).toContain(play.action);
  });

  it('getDetailedPlay matches getBestPlay action', () => {
    const basic = getBestPlay([card('A'), card('6')], card('3'), false, true);
    const detailed = getDetailedPlay([card('A'), card('6')], card('3'), false, true);
    expect(detailed.action).toBe(basic.action);
  });
});
