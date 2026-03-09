pragma circom 2.1.6;

/*
 * declaration_valid.circom
 *
 * Proves: the declared hand rank is truthful for the committed card hand,
 * without revealing the actual card values.
 *
 * Private inputs:
 *   cards[5]          — actual card values [1..52]
 *   salt              — blinding factor used when computing commitment
 *
 * Public inputs:
 *   commitment        — Poseidon(cards[0..4], salt) — must match committed value
 *   declaration_type  — numeric rank claimed (see DeclarationType enum below)
 *
 * Declaration types:
 *   0 = HighCard
 *   1 = OnePair
 *   2 = TwoPair
 *   3 = ThreeOfAKind
 *   4 = Straight
 *   5 = Flush
 *   6 = FullHouse
 *   7 = FourOfAKind
 *   8 = StraightFlush
 *
 * Card encoding: value = (rank - 1) * 4 + suit,  rank in [1..13], suit in [0..3]
 */

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/gates.circom";

// ── Helper: extract rank from card value ─────────────────────────────────────

template CardRank() {
    signal input card;  // [1..52]
    signal output rank; // [1..13]

    // rank = floor((card - 1) / 4) + 1
    // Witness: compute via integer division
    signal r;
    r <-- (card - 1) \ 4 + 1;

    // Enforce: lo = card - (r-1)*4, and lo in [1..4]
    signal lo;
    lo <== card - (r - 1) * 4;

    component ge = GreaterEqThan(4);
    ge.in[0] <== lo;
    ge.in[1] <== 1;
    ge.out === 1;

    component le = LessEqThan(4);
    le.in[0] <== lo;
    le.in[1] <== 4;
    le.out === 1;

    rank <== r;
}

// ── Helper: count occurrences of target among N values ───────────────────────

template CountRank(N) {
    signal input ranks[N];
    signal input target;
    signal output count;

    component eq[N];
    signal running[N+1];
    running[0] <== 0;
    for (var i = 0; i < N; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== ranks[i];
        eq[i].in[1] <== target;
        running[i+1] <== running[i] + eq[i].out;
    }
    count <== running[N];
}

// ── Main circuit ─────────────────────────────────────────────────────────────

template DeclarationValid() {
    // Private
    signal input cards[5];
    signal input salt;

    // Public
    signal input commitment;
    signal input declaration_type;

    // ── 1. Re-derive commitment ──────────────────────────────────────────────
    component hasher = Poseidon(6);
    hasher.inputs[0] <== cards[0];
    hasher.inputs[1] <== cards[1];
    hasher.inputs[2] <== cards[2];
    hasher.inputs[3] <== cards[3];
    hasher.inputs[4] <== cards[4];
    hasher.inputs[5] <== salt;
    commitment === hasher.out;

    // ── 2. Extract ranks ─────────────────────────────────────────────────────
    component rankExtract[5];
    signal ranks[5];
    for (var i = 0; i < 5; i++) {
        rankExtract[i] = CardRank();
        rankExtract[i].card <== cards[i];
        ranks[i] <== rankExtract[i].rank;
    }

    // ── 3. Rank frequency counts ─────────────────────────────────────────────
    component cnt[13];
    signal freq[13];
    for (var r = 0; r < 13; r++) {
        cnt[r] = CountRank(5);
        for (var i = 0; i < 5; i++) {
            cnt[r].ranks[i] <== ranks[i];
        }
        cnt[r].target <== r + 1;
        freq[r] <== cnt[r].count;
    }

    // ── 4a. Count ranks that appear >= 2 (pair), >= 3 (three), >= 4 (four) ──

    signal pair_flags[13];
    component pair_ge[13];
    signal pair_running[14];
    pair_running[0] <== 0;
    for (var r = 0; r < 13; r++) {
        pair_ge[r] = GreaterEqThan(4);
        pair_ge[r].in[0] <== freq[r];
        pair_ge[r].in[1] <== 2;
        pair_flags[r] <== pair_ge[r].out;
        pair_running[r+1] <== pair_running[r] + pair_flags[r];
    }
    signal has_pair_count;
    has_pair_count <== pair_running[13];

    signal three_flags[13];
    component three_ge[13];
    signal three_running[14];
    three_running[0] <== 0;
    for (var r = 0; r < 13; r++) {
        three_ge[r] = GreaterEqThan(4);
        three_ge[r].in[0] <== freq[r];
        three_ge[r].in[1] <== 3;
        three_flags[r] <== three_ge[r].out;
        three_running[r+1] <== three_running[r] + three_flags[r];
    }
    signal has_three_count;
    has_three_count <== three_running[13];

    signal four_flags[13];
    component four_ge[13];
    signal four_running[14];
    four_running[0] <== 0;
    for (var r = 0; r < 13; r++) {
        four_ge[r] = GreaterEqThan(4);
        four_ge[r].in[0] <== freq[r];
        four_ge[r].in[1] <== 4;
        four_flags[r] <== four_ge[r].out;
        four_running[r+1] <== four_running[r] + four_flags[r];
    }
    signal has_four_count;
    has_four_count <== four_running[13];

    // ── 4b. Derived predicates ────────────────────────────────────────────────

    // Two-pair: pair_count >= 2
    component two_pair_ge = GreaterEqThan(4);
    two_pair_ge.in[0] <== has_pair_count;
    two_pair_ge.in[1] <== 2;
    signal has_two_pair;
    has_two_pair <== two_pair_ge.out;

    // Full house: has_pair AND has_three (use components, no ternary in <==)
    component fh_pair_ge = GreaterEqThan(4);
    fh_pair_ge.in[0] <== has_pair_count;
    fh_pair_ge.in[1] <== 1;

    component fh_three_ge = GreaterEqThan(4);
    fh_three_ge.in[0] <== has_three_count;
    fh_three_ge.in[1] <== 1;

    component fh_and = AND();
    fh_and.a <== fh_pair_ge.out;
    fh_and.b <== fh_three_ge.out;
    signal has_full_house;
    has_full_house <== fh_and.out;

    // Four of a kind: four_count >= 1
    component four_pred_ge = GreaterEqThan(4);
    four_pred_ge.in[0] <== has_four_count;
    four_pred_ge.in[1] <== 1;
    signal has_four;
    has_four <== four_pred_ge.out;

    // ── 4c. Suits and flush ───────────────────────────────────────────────────

    // suit(card) = (card-1) % 4, constrained by: card = (rank-1)*4 + suit + 1
    signal suits[5];
    // Component arrays must be declared outside for-loops in Circom 2
    component suit_ge_zero[5];
    component suit_range_le[5];
    for (var i = 0; i < 5; i++) {
        suits[i] <-- (cards[i] - 1) % 4;

        // suit in [0..3]
        suit_ge_zero[i] = GreaterEqThan(3);
        suit_ge_zero[i].in[0] <== suits[i];
        suit_ge_zero[i].in[1] <== 0;
        suit_ge_zero[i].out === 1;

        suit_range_le[i] = LessEqThan(3);
        suit_range_le[i].in[0] <== suits[i];
        suit_range_le[i].in[1] <== 3;
        suit_range_le[i].out === 1;

        // card = (rank-1)*4 + suit + 1  (ties suit to the card value)
        cards[i] === (ranks[i] - 1) * 4 + suits[i] + 1;
    }

    // Flush: all suits equal
    component suit_eq01 = IsEqual();
    suit_eq01.in[0] <== suits[0];
    suit_eq01.in[1] <== suits[1];

    component suit_eq12 = IsEqual();
    suit_eq12.in[0] <== suits[1];
    suit_eq12.in[1] <== suits[2];

    component suit_eq23 = IsEqual();
    suit_eq23.in[0] <== suits[2];
    suit_eq23.in[1] <== suits[3];

    component suit_eq34 = IsEqual();
    suit_eq34.in[0] <== suits[3];
    suit_eq34.in[1] <== suits[4];

    component flush_and1 = AND();
    flush_and1.a <== suit_eq01.out;
    flush_and1.b <== suit_eq12.out;

    component flush_and2 = AND();
    flush_and2.a <== flush_and1.out;
    flush_and2.b <== suit_eq23.out;

    component flush_and3 = AND();
    flush_and3.a <== flush_and2.out;
    flush_and3.b <== suit_eq34.out;

    signal has_flush;
    has_flush <== flush_and3.out;

    // ── 4d. Straight via sorted ranks ────────────────────────────────────────
    //
    // Sorting strategy: compute a sorted copy of ranks using a var array (bubble
    // sort over vars, which can hold signal values during witness generation).
    // Then verify correctness by checking:
    //   (a) sorted is a permutation of ranks  (sum + sum-of-squares invariant)
    //   (b) sorted is non-decreasing
    //   (c) sorted[4] - sorted[0] == 4 and no pairs  =>  5 consecutive ranks

    signal sorted[5];

    // Witness: bubble-sort ranks into a var array, then assign to signals
    var stmp[5];
    stmp[0] = ranks[0];
    stmp[1] = ranks[1];
    stmp[2] = ranks[2];
    stmp[3] = ranks[3];
    stmp[4] = ranks[4];
    for (var sa = 0; sa < 5; sa++) {
        for (var sb = sa + 1; sb < 5; sb++) {
            if (stmp[sa] > stmp[sb]) {
                var st = stmp[sa];
                stmp[sa] = stmp[sb];
                stmp[sb] = st;
            }
        }
    }
    for (var si = 0; si < 5; si++) {
        sorted[si] <-- stmp[si];
    }

    // Verify sorted is a permutation via sum and sum-of-squares
    signal rs[6];   rs[0]  <== 0;
    signal rss[6];  rss[0] <== 0;
    signal ss[6];   ss[0]  <== 0;
    signal sss[6];  sss[0] <== 0;
    for (var i = 0; i < 5; i++) {
        rs[i+1]  <== rs[i]  + ranks[i];
        rss[i+1] <== rss[i] + ranks[i] * ranks[i];
        ss[i+1]  <== ss[i]  + sorted[i];
        sss[i+1] <== sss[i] + sorted[i] * sorted[i];
    }
    rs[5]  === ss[5];
    rss[5] === sss[5];

    // Verify sorted is non-decreasing
    component sorted_le[4];
    for (var i = 0; i < 4; i++) {
        sorted_le[i] = LessEqThan(6);
        sorted_le[i].in[0] <== sorted[i];
        sorted_le[i].in[1] <== sorted[i+1];
        sorted_le[i].out === 1;
    }

    // Straight: span == 4 AND no repeated ranks
    signal rank_span;
    rank_span <== sorted[4] - sorted[0];

    component span_eq = IsEqual();
    span_eq.in[0] <== rank_span;
    span_eq.in[1] <== 4;

    component no_pair_eq = IsEqual();
    no_pair_eq.in[0] <== has_pair_count;
    no_pair_eq.in[1] <== 0;

    component straight_and = AND();
    straight_and.a <== span_eq.out;
    straight_and.b <== no_pair_eq.out;
    signal has_straight;
    has_straight <== straight_and.out;

    // Straight flush
    component sf_and = AND();
    sf_and.a <== has_straight;
    sf_and.b <== has_flush;
    signal has_straight_flush;
    has_straight_flush <== sf_and.out;

    // ── 5. Select predicate for the declared type ────────────────────────────
    //
    // Predicates indexed by declaration_type (0..8):
    //   0 = HighCard      — always 1
    //   1 = OnePair       — pair_count >= 1
    //   2 = TwoPair       — pair_count >= 2
    //   3 = ThreeOfAKind  — three_count >= 1
    //   4 = Straight      — has_straight
    //   5 = Flush         — has_flush
    //   6 = FullHouse     — has_full_house
    //   7 = FourOfAKind   — has_four
    //   8 = StraightFlush — has_straight_flush

    // is_selected[t] == 1 iff declaration_type == t
    component dt_eq[9];
    signal dt_sel[9];
    for (var t = 0; t < 9; t++) {
        dt_eq[t] = IsEqual();
        dt_eq[t].in[0] <== declaration_type;
        dt_eq[t].in[1] <== t;
        dt_sel[t] <== dt_eq[t].out;
    }

    // Predicate for OnePair
    component pair_pred_ge = GreaterEqThan(4);
    pair_pred_ge.in[0] <== has_pair_count;
    pair_pred_ge.in[1] <== 1;

    // pred[t] = the boolean predicate for declaration type t
    signal pred[9];
    pred[0] <== 1;                    // HighCard always holds
    pred[1] <== pair_pred_ge.out;     // OnePair
    pred[2] <== has_two_pair;         // TwoPair
    pred[3] <== fh_three_ge.out;      // ThreeOfAKind (reuse fh_three_ge)
    pred[4] <== has_straight;         // Straight
    pred[5] <== has_flush;            // Flush
    pred[6] <== has_full_house;       // FullHouse
    pred[7] <== has_four;             // FourOfAKind
    pred[8] <== has_straight_flush;   // StraightFlush

    // weighted[t] = dt_sel[t] * pred[t]
    // Since exactly one dt_sel[t] == 1, sum(weighted) == pred[chosen_type]
    signal weighted[9];
    for (var t = 0; t < 9; t++) {
        weighted[t] <== dt_sel[t] * pred[t];
    }

    signal total_pred;
    total_pred <== weighted[0] + weighted[1] + weighted[2] + weighted[3] +
                   weighted[4] + weighted[5] + weighted[6] + weighted[7] + weighted[8];

    // The selected predicate must hold
    total_pred === 1;
}

component main { public [commitment, declaration_type] } = DeclarationValid();
