-- FINDING-016: Remove orphaned GIFT_VOUCHER_ENABLED feature flag row.
-- GIFT_VOUCHER_ENABLED is a legacy duplicate of GIFT_CARDS_ENABLED.
-- The code now only references GIFT_CARDS_ENABLED, so the DB row is removed.
DELETE FROM feature_flags WHERE key = 'GIFT_VOUCHER_ENABLED';
