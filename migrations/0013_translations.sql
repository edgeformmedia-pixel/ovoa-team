-- ovoa.ai in other languages (src/lib/i18n): each piece of English text in the
-- site's code, translated once by Workers AI and served from here after.
CREATE TABLE IF NOT EXISTS translations (
  lang TEXT NOT NULL,
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (lang, source)
);
