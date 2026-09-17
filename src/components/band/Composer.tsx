type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
};

export function Composer({ value, onChange, onSubmit, disabled }: Props) {
  return (
    <form
      className="band-composer"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v || disabled) return;
        onSubmit(v);
      }}
    >
      <input
        aria-label="Tell Ovoa what to do"
        placeholder="Tell Ovoa what to do."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-band-text outline-none placeholder:text-band-dim"
      />
      <button type="submit" className="band-btn-ghost shrink-0" disabled={disabled}>
        Send
      </button>
    </form>
  );
}
