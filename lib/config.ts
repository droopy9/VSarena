// Project-wide constants. Tweak these as the on-chain pieces land.

export const TOKEN_TICKER = "ARENA";
// Placeholder contract address — replace with the real SPL mint when deployed.
export const CONTRACT_ADDRESS = "ArenAPlaceho1der1111111111111111111111111111";

export const FEE_BPS = 500; // 5% — buyback+burn
export const PAYOUT_BPS = 9500; // 95% — winner take

export const WHEEL_MIN_PLAYERS = 2;
export const WHEEL_MAX_PLAYERS = 15;

// Wheel raffle (fixed-ticket) mode — every entry is equal weight.
export const RAFFLE_TICKET_PRICE = 2; // $ equivalent of SOL
