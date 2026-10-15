-- Over to you, skip: the only table. One row per day × puzzle × event × dimensions, holding a count.
-- No raw events, no IP addresses, no browser details, nothing that recognises a player.
CREATE TABLE IF NOT EXISTS counters (
  day     TEXT    NOT NULL,              -- London date, set by the server
  puzzle  TEXT    NOT NULL,
  event   TEXT    NOT NULL,
  stars   INTEGER NOT NULL DEFAULT -1,   -- half-stars 0..10 on a first attempt; -1 otherwise
  saved   INTEGER NOT NULL DEFAULT -1,   -- 1 / 0 on a first attempt; -1 otherwise
  ret     INTEGER NOT NULL DEFAULT -1,   -- returning player on a view: 1 / 0; -1 otherwise
  dsl     TEXT    NOT NULL DEFAULT '',   -- days since last play: new, 0, 1, 2-6, 7+
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, puzzle, event, stars, saved, ret, dsl)
);
