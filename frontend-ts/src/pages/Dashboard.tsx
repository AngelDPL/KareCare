import { useState, useEffect } from "react"
import { useApp } from "../context/AppContext"
import { get } from "../services/api"
import { StatCard } from "../components/StatCard"
import type { DashboardStats } from "../types/"

const Dashboard = () => {

    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState<boolean>(true)

    const { user, isAdmin } = useApp()

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const appointments = await get("/appointments/stats")
                const payments = await get("/payments/stats")
                setStats({ appointments, payments })
            } catch (err: any) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading...</p>
        </div>
    )


    return (
        <div className="max-w-7xl mx-auto">
            <div className="max-w-7xl mx-auto">

                <div className="mb-8">
                    <h1 className="text-xl font-medium text-slate-200">Welcome, {user?.username}</h1>
                    <p className="text-sm text-slate-400 mt-1">{isAdmin() ? "Administration panel" : "Employee panel"}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total appointments"
                        value={stats?.appointments?.total ?? 0}
                        colorClass="bg-indigo-900 text-indigo-300"
                        icon="ti-calendar"
                    />
                    <StatCard
                        title="Pending"
                        value={stats?.appointments?.pending ?? 0}
                        colorClass="bg-amber-900 text-amber-300"
                        icon="ti-clock"
                    />
                    <StatCard
                        title="Completed"
                        value={stats?.appointments?.completed ?? 0}
                        colorClass="bg-green-900 text-green-300"
                        icon="ti-check"
                    />
                    <StatCard
                        title="Collected"
                        value={`€${stats?.payments?.total_collected ?? "0.00"}`}
                        colorClass="bg-blue-900 text-blue-300"
                        icon="ti-coin"
                    />
                </div>

                {isAdmin() && (
                    <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6">
                        <h2 className="text-base font-medium text-slate-200 mb-4">Payment Summary</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-slate-800 rounded-xl">
                                <p className="text-lg font-semibold text-slate-200 break-all">€{stats?.payments?.total_estimated ?? "0.00"}</p>
                                <p className="text-sm text-slate-400 mt-1">Estimated total</p>
                            </div>
                            <div className="text-center p-4 bg-green-950 rounded-xl">
                                <p className="text-lg font-semibold text-slate-200 break-all">€{stats?.payments?.total_collected ?? "0.00"}</p>
                                <p className="text-sm text-slate-400 mt-1">Collected</p>
                            </div>
                            <div className="text-center p-4 bg-red-950 rounded-xl">
                                <p className="text-lg font-semibold text-slate-200 break-all">€{stats?.payments?.total_pending ?? "0.00"}</p>
                                <p className="text-sm text-slate-400 mt-1">Pending</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default Dashboard