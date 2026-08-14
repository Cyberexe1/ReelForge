const STACK = ['Amazon Bedrock', 'Nova', 'AWS Lambda', 'API Gateway', 'Amazon S3'];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70 py-10">
      <div className="rf-shell flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-chalk">REELFORGE</p>
          <p className="mt-1 text-sm text-mist">Your memory. Your movie.</p>
        </div>

        <ul className="flex flex-wrap items-center gap-2">
          {STACK.map((service) => (
            <li
              key={service}
              className="rounded-full border border-line bg-surface/60 px-3 py-1 text-xs text-mist"
            >
              {service}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
