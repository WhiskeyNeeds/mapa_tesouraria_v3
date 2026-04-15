export function KpiCard(props: { title: string; value: string; note: string }) {
    return (
        <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{props.title}</p>
                <span className="h-8 w-8 rounded-lg bg-blue-50" />
            </div>
            <h3 className="font-mono text-2xl font-bold text-slate-900">{props.value}</h3>
            <p className="mt-1 text-xs text-slate-500">{props.note}</p>
        </article>
    );
}