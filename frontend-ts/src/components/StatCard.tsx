interface StatCardProps {
    title: string
    value: number | string
    colorClass: string
    icon: string
}

export const StatCard = ({ title, value, colorClass, icon }: StatCardProps) => (
    <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 flex flex-col items-center gap-3">
        <div className={`${colorClass} w-12 h-12 rounded-xl flex items-center justify-center`}>
            <i className={`ti ${icon} text-2xl`} aria-hidden="true" />
        </div>
        <div className="text-center">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-semibold text-slate-200 mt-1">{value}</p>
        </div>
    </div>
)