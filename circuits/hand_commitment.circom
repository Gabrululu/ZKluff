pragma circom 2.1.6;

/*
 * hand_commitment.circom
 *
 * Proves: commitment = Poseidon(card1, card2, card3, card4, card5, salt)
 * without revealing the individual card values.
 *
 * Private inputs:
 *   cards[5]  — card values, each in range [1, 52]
 *   salt      — random blinding factor (254-bit field element)
 *
 * Public inputs:
 *   commitment — Poseidon hash of (cards[0..4], salt)
 *
 * Note: Poseidon is used instead of Pedersen because circomlib's Poseidon
 *       is much cheaper in constraints and its output matches Starknet's
 *       native Poseidon hash (same parameters).
 */

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template HandCommitment() {
    // ── Private inputs ──────────────────────────────────────────────────────
    signal input cards[5];
    signal input salt;

    // ── Public inputs ───────────────────────────────────────────────────────
    signal input commitment;

    // ── Range check: each card must be in [1, 52] ───────────────────────────
    component ge[5];  // cards[i] >= 1
    component le[5];  // cards[i] <= 52

    for (var i = 0; i < 5; i++) {
        ge[i] = GreaterEqThan(8);   // 8 bits covers 0..255
        ge[i].in[0] <== cards[i];
        ge[i].in[1] <== 1;
        ge[i].out === 1;

        le[i] = LessEqThan(8);
        le[i].in[0] <== cards[i];
        le[i].in[1] <== 52;
        le[i].out === 1;
    }

    // ── Compute commitment: Poseidon(cards[0..4], salt) ─────────────────────
    component hasher = Poseidon(6);
    hasher.inputs[0] <== cards[0];
    hasher.inputs[1] <== cards[1];
    hasher.inputs[2] <== cards[2];
    hasher.inputs[3] <== cards[3];
    hasher.inputs[4] <== cards[4];
    hasher.inputs[5] <== salt;

    // ── Assert commitment matches ────────────────────────────────────────────
    commitment === hasher.out;
}

component main { public [commitment] } = HandCommitment();
