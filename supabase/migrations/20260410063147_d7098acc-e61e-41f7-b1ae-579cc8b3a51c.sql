UPDATE retailer_external_unsorted
SET address =
  'Shop No. ' || FLOOR(RANDOM() * 50 + 1)::int || ', ' ||
  COALESCE(NULLIF("Village Visited", ''), 'Local Area') || ', ' ||
  "City" || ', ' ||
  COALESCE(NULLIF("State", ''), 'Karnataka') ||
  CASE
    WHEN pin_code IS NOT NULL AND pin_code != '' THEN ' - ' || pin_code
    ELSE ' - 000000'
  END
WHERE "City" = 'Hassan';