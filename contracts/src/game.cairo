/// ZKluff main game contract.
///
/// Game flow per room:
///   1. Player A calls create_room (deposits bet).
///   2. Player B calls join_room (deposits matching bet).
///   3. Both players call commit_hand — submitting Pedersen(card1..card5 + salt).
///   4. Active player calls declare — submits declaration type + ZK proof.
///   5. Opponent can call challenge OR fold.
///      - challenge: verifier resolves winner; loser forfeits pot.
///      - fold: challenger concedes the round; active player wins pot.
///   6. Winner gets pot transferred from contract.

use starknet::ContractAddress;

// ── Declaration types ──────────────────────────────────────────────────────────

#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Copy, Serde, PartialEq, starknet::Store)]
pub enum DeclarationType {
    HighCard,      // 0
    OnePair,       // 1
    TwoPair,       // 2
    ThreeOfAKind,  // 3
    Straight,      // 4
    Flush,         // 5
    FullHouse,     // 6
    FourOfAKind,   // 7
    StraightFlush, // 8
}

// ── Game phases ────────────────────────────────────────────────────────────────

#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Copy, Serde, PartialEq, starknet::Store)]
pub enum GamePhase {
    WaitingForPlayers, // room created, waiting for opponent
    CommitPhase,       // both players must commit hand hashes
    DeclarationPhase,  // active player must declare
    ChallengePhase,    // opponent may challenge or fold
    Resolved,          // game over
}

// ── Room storage struct ────────────────────────────────────────────────────────

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct Room {
    player_a: ContractAddress,
    player_b: ContractAddress,
    bet_amount: u256,
    pot: u256,
    phase: GamePhase,
    // Hand commitments: Pedersen(card1, card2, card3, card4, card5, salt)
    commitment_a: felt252,
    commitment_b: felt252,
    // Who is currently the "active" declarer (0 = player_a, 1 = player_b)
    active_player_index: u8,
    // Last declaration
    declaration: DeclarationType,
    // Declaration proof public inputs cached for challenge resolution
    declaration_commitment: felt252,
    declaration_type_felt: felt252,
    winner: ContractAddress,
}

// ── Interface ──────────────────────────────────────────────────────────────────

#[starknet::interface]
pub trait IGame<TContractState> {
    fn create_room(ref self: TContractState, bet_amount: u256) -> u32;
    fn join_room(ref self: TContractState, room_id: u32);
    fn commit_hand(ref self: TContractState, room_id: u32, commitment: felt252);
    fn declare(
        ref self: TContractState,
        room_id: u32,
        declaration: DeclarationType,
        proof_a: (felt252, felt252),
        proof_b: ((felt252, felt252), (felt252, felt252)),
        proof_c: (felt252, felt252),
    );
    fn challenge(ref self: TContractState, room_id: u32);
    fn fold(ref self: TContractState, room_id: u32);
    fn get_room(self: @TContractState, room_id: u32) -> Room;
    fn get_next_room_id(self: @TContractState) -> u32;
}

// ── Contract ───────────────────────────────────────────────────────────────────

#[starknet::contract]
pub mod Game {
    use super::{IGame, Room, GamePhase, DeclarationType};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use crate::verifier::{IVerifierDispatcher, IVerifierDispatcherTrait};
    use crate::mock_token::{IMockTokenDispatcher, IMockTokenDispatcherTrait};

    // ── Storage ────────────────────────────────────────────────────────────────

    #[storage]
    struct Storage {
        rooms: Map<u32, Room>,
        next_room_id: u32,
        token_address: ContractAddress,
        verifier_address: ContractAddress,
        // Track whether each player has committed in a room
        has_committed: Map<(u32, ContractAddress), bool>,
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        RoomCreated: RoomCreated,
        PlayerJoined: PlayerJoined,
        HandCommitted: HandCommitted,
        DeclarationMade: DeclarationMade,
        GameResolved: GameResolved,
    }

    #[derive(Drop, starknet::Event)]
    struct RoomCreated {
        #[key]
        room_id: u32,
        player_a: ContractAddress,
        bet_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct PlayerJoined {
        #[key]
        room_id: u32,
        player_b: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct HandCommitted {
        #[key]
        room_id: u32,
        player: ContractAddress,
        commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct DeclarationMade {
        #[key]
        room_id: u32,
        player: ContractAddress,
        declaration_type: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct GameResolved {
        #[key]
        room_id: u32,
        winner: ContractAddress,
        pot: u256,
    }

    // ── Constructor ────────────────────────────────────────────────────────────

    #[constructor]
    fn constructor(
        ref self: ContractState,
        token_address: ContractAddress,
        verifier_address: ContractAddress,
    ) {
        self.token_address.write(token_address);
        self.verifier_address.write(verifier_address);
        self.next_room_id.write(1);
    }

    // ── Implementation ─────────────────────────────────────────────────────────

    #[abi(embed_v0)]
    impl GameImpl of IGame<ContractState> {
        /// Player A creates a room and deposits bet_amount tokens.
        fn create_room(ref self: ContractState, bet_amount: u256) -> u32 {
            let caller = get_caller_address();
            assert(bet_amount > 0, 'bet must be > 0');

            // Pull tokens from player A into contract
            let token = IMockTokenDispatcher { contract_address: self.token_address.read() };
            token.transfer_from(caller, get_contract_address(), bet_amount);

            let room_id = self.next_room_id.read();
            self.next_room_id.write(room_id + 1);

            let zero_addr: ContractAddress = 0.try_into().unwrap();
            let room = Room {
                player_a: caller,
                player_b: zero_addr,
                bet_amount,
                pot: bet_amount,
                phase: GamePhase::WaitingForPlayers,
                commitment_a: 0,
                commitment_b: 0,
                active_player_index: 0,
                declaration: DeclarationType::HighCard,
                declaration_commitment: 0,
                declaration_type_felt: 0,
                winner: zero_addr,
            };
            self.rooms.write(room_id, room);
            self.emit(RoomCreated { room_id, player_a: caller, bet_amount });
            room_id
        }

        /// Player B joins a waiting room and deposits matching bet.
        fn join_room(ref self: ContractState, room_id: u32) {
            let caller = get_caller_address();
            let mut room = self.rooms.read(room_id);
            assert(room.phase == GamePhase::WaitingForPlayers, 'room not open');
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            assert(room.player_b == zero_addr, 'room already full');
            assert(room.player_a != caller, 'cannot join own room');

            let token = IMockTokenDispatcher { contract_address: self.token_address.read() };
            token.transfer_from(caller, get_contract_address(), room.bet_amount);

            room.player_b = caller;
            room.pot = room.pot + room.bet_amount;
            room.phase = GamePhase::CommitPhase;
            self.rooms.write(room_id, room);
            self.emit(PlayerJoined { room_id, player_b: caller });
        }

        /// A player commits their hand hash.  Both must commit before declarations begin.
        fn commit_hand(ref self: ContractState, room_id: u32, commitment: felt252) {
            let caller = get_caller_address();
            let mut room = self.rooms.read(room_id);
            assert(room.phase == GamePhase::CommitPhase, 'not commit phase');
            assert(
                caller == room.player_a || caller == room.player_b,
                'not a participant',
            );
            assert(
                !self.has_committed.read((room_id, caller)), 'already committed',
            );

            self.has_committed.write((room_id, caller), true);

            if caller == room.player_a {
                room.commitment_a = commitment;
            } else {
                room.commitment_b = commitment;
            }

            // Advance phase once both have committed
            let a_committed = self.has_committed.read((room_id, room.player_a));
            let b_committed = self.has_committed.read((room_id, room.player_b));
            if a_committed && b_committed {
                room.phase = GamePhase::DeclarationPhase;
                // Player A goes first
                room.active_player_index = 0;
            }

            self.rooms.write(room_id, room);
            self.emit(HandCommitted { room_id, player: caller, commitment });
        }

        /// Active player makes a declaration with a ZK proof.
        fn declare(
            ref self: ContractState,
            room_id: u32,
            declaration: DeclarationType,
            proof_a: (felt252, felt252),
            proof_b: ((felt252, felt252), (felt252, felt252)),
            proof_c: (felt252, felt252),
        ) {
            let caller = get_caller_address();
            let mut room = self.rooms.read(room_id);
            assert(room.phase == GamePhase::DeclarationPhase, 'not declaration phase');

            let active_player = self._get_active_player(@room);
            assert(caller == active_player, 'not your turn');

            // Determine which commitment to use
            let commitment = if room.active_player_index == 0 {
                room.commitment_a
            } else {
                room.commitment_b
            };

            let declaration_felt = declaration_to_felt(declaration);

            // Verify proof on-chain
            let mut public_inputs: Array<felt252> = ArrayTrait::new();
            public_inputs.append(commitment);
            public_inputs.append(declaration_felt);

            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let valid = verifier.verify_declaration(proof_a, proof_b, proof_c, public_inputs);
            assert(valid, 'invalid ZK proof');

            room.declaration = declaration;
            room.declaration_commitment = commitment;
            room.declaration_type_felt = declaration_felt;
            room.phase = GamePhase::ChallengePhase;
            self.rooms.write(room_id, room);

            self.emit(DeclarationMade { room_id, player: caller, declaration_type: declaration_felt });
        }

        /// Opponent challenges the declaration — verifier re-checks; invalid declaration loses.
        /// Since the proof was already verified on-chain in declare(), a challenge causes the
        /// active player to WIN (their proof was valid). This simulates the full reveal flow;
        /// in a production version the reveal would re-run the verifier with opened cards.
        fn challenge(ref self: ContractState, room_id: u32) {
            let caller = get_caller_address();
            let mut room = self.rooms.read(room_id);
            assert(room.phase == GamePhase::ChallengePhase, 'not challenge phase');

            let inactive_player = self._get_inactive_player(@room);
            assert(caller == inactive_player, 'not your turn to challenge');

            // Because the ZK proof was already validated in declare(),
            // the declaration is considered truthful — challenger loses.
            let winner = self._get_active_player(@room);
            self._resolve_game(ref room, room_id, winner);
        }

        /// Opponent folds — active player wins the pot.
        fn fold(ref self: ContractState, room_id: u32) {
            let caller = get_caller_address();
            let mut room = self.rooms.read(room_id);
            assert(room.phase == GamePhase::ChallengePhase, 'not challenge phase');

            let inactive_player = self._get_inactive_player(@room);
            assert(caller == inactive_player, 'not your turn');

            let winner = self._get_active_player(@room);
            self._resolve_game(ref room, room_id, winner);
        }

        fn get_room(self: @ContractState, room_id: u32) -> Room {
            self.rooms.read(room_id)
        }

        fn get_next_room_id(self: @ContractState) -> u32 {
            self.next_room_id.read()
        }
    }

    // ── Internal helpers ───────────────────────────────────────────────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _get_active_player(self: @ContractState, room: @Room) -> ContractAddress {
            if *room.active_player_index == 0 {
                *room.player_a
            } else {
                *room.player_b
            }
        }

        fn _get_inactive_player(self: @ContractState, room: @Room) -> ContractAddress {
            if *room.active_player_index == 0 {
                *room.player_b
            } else {
                *room.player_a
            }
        }

        fn _resolve_game(
            ref self: ContractState, ref room: Room, room_id: u32, winner: ContractAddress,
        ) {
            room.phase = GamePhase::Resolved;
            room.winner = winner;
            let pot = room.pot;
            room.pot = 0;
            self.rooms.write(room_id, room);

            // Transfer pot to winner
            let token = IMockTokenDispatcher { contract_address: self.token_address.read() };
            token.transfer(winner, pot);

            self.emit(GameResolved { room_id, winner, pot });
        }

    }

    fn declaration_to_felt(declaration: DeclarationType) -> felt252 {
        match declaration {
            DeclarationType::HighCard => 0,
            DeclarationType::OnePair => 1,
            DeclarationType::TwoPair => 2,
            DeclarationType::ThreeOfAKind => 3,
            DeclarationType::Straight => 4,
            DeclarationType::Flush => 5,
            DeclarationType::FullHouse => 6,
            DeclarationType::FourOfAKind => 7,
            DeclarationType::StraightFlush => 8,
        }
    }
}
