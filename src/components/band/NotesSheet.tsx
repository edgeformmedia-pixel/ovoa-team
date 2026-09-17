import { useState } from "react";
import { useBand } from "@/components/band/BandStore";

export function NotesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notes, removeNote } = useBand();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const shown = q
    ? notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.transcript.toLowerCase().includes(q),
      )
    : notes;
  const current = notes.find((n) => n.id === detail);

  return (
    <div className="band-sheet-wrap" role="dialog" aria-label="Notes">
      <button type="button" aria-label="Close notes" onClick={onClose} className="band-sheet-scrim" />
      <div className="band-sheet">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] leading-snug text-band-dim">
            Click the band twice and talk. Kept word for word.
          </p>
          <button type="button" onClick={onClose} className="band-btn-ghost shrink-0">
            Close
          </button>
        </div>

        {current ? (
          <>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-band-dim">
              {current.at} · {current.place}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-band-text">{current.transcript}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="band-btn-ghost" onClick={() => setDetail(null)}>
                Back
              </button>
              <button
                type="button"
                className="band-btn-ghost"
                onClick={() => {
                  removeNote(current.id);
                  setDetail(null);
                }}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="band-composer mt-4">
              <input
                aria-label="Search notes"
                placeholder="Search your notes."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-band-text outline-none placeholder:text-band-dim"
              />
            </div>

            <ul className="mt-3 space-y-2">
              {shown.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(n.id)}
                    className={`band-card flex w-full items-center gap-3 px-4 py-3 text-left ${
                      n.fresh ? "band-flash" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-band-text">{n.title}</span>
                      <span className="block truncate text-[12px] text-band-dim">
                        {n.transcript}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-band-dim">{n.at}</span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="text-[13px] text-band-dim">Nothing matches that.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
