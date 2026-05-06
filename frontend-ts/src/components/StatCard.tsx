interface StatCardProps {
    title: string
    value: number | string
    color: string
    icon: string
}

export const StatCard = ({ title, value, color, icon }: StatCardProps) => (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
        <div className={`${color} text-white text-2xl w-12 h-12 rounded-xl flex items-center justify-center`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
)