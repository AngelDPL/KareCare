import { useState, useEffect } from "react"
import { useApp } from "../context/AppContext"
import { get } from "../services/api"

const Dashboard = () => {
    const { user, isAdmin } = useApp()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const appointments = await get("/appointments/stats")
                const payments = await get("/payments/stats")
                setStats({ appointments, payments })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Cargando...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Bienvenido, {user?.username} 👋
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isAdmin() ? "Panel de administración" : "Panel de empleado"}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total citas"
                        value={stats?.appointments?.total ?? 0}
                        color="bg-indigo-500"
                        icon="📅"
                    />
                    <StatCard
                        title="Pendientes"
                        value={stats?.appointments?.pending ?? 0}
                        color="bg-yellow-500"
                        icon="⏳"
                    />
                    <StatCard
                        title="Completadas"
                        value={stats?.appointments?.completed ?? 0}
                        color="bg-green-500"
                        icon="✅"
                    />
                    <StatCard
                        title="Cobrado"
                        value={`€${stats?.payments?.total_collected ?? "0.00"}`}
                        color="bg-blue-500"
                        icon="💰"
                    />
                </div>

                {isAdmin() && (
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            Resumen de pagos
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <p className="text-2xl font-bold text-gray-800">
                                    €{stats?.payments?.total_estimated ?? "0.00"}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Total estimado</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-xl">
                                <p className="text-2xl font-bold text-green-600">
                                    €{stats?.payments?.total_collected ?? "0.00"}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Cobrado</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-xl">
                                <p className="text-2xl font-bold text-red-500">
                                    €{stats?.payments?.total_pending ?? "0.00"}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Pendiente</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

const StatCard = ({ title, value, color, icon }) => (
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

export default Dashboard