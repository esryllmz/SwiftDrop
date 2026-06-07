type JsonPreviewProps = {
  value: unknown;
  maxHeight?: string;
};

export function JsonPreview({ value, maxHeight = "20rem" }: JsonPreviewProps) {
  return (
    <pre
      className="overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-xs leading-5 text-slate-800"
      style={{ maxHeight }}
    >
      {formatJson(value)}
    </pre>
  );
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  return JSON.stringify(value, null, 2);
}
