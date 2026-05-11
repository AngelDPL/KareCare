import { useState, useEffect } from "react"
import { get, post, put } from "../services/api"
import type { Appointment, Client, Service, User, AppointmentStatus } from "../types"

interface AppointmentForm {
    user_id: string
    client_id: string
    service_id: string
    business_id: number
    date_time: string
    duration_hours: number
}

const Appointments = () => {

    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<AppointmentForm>({
        user_id: "", client_id: "", service_id: "",
        business_id: 1, date_time: "", duration_hours: 1
    })
    const [filterUser, setFilterUser] = useState<string>("")
    const [filterDate, setFilterDate] = useState<string>("")
    const [confirmModal, setConfirmModal] = useState<{
        id: number
        status: AppointmentStatus
        label: string
    } | null>(null)

    const fetchAll = async () => {
        try {
            const [appointments, clients, services, users] = await Promise.all([
                get("/appointments"), get("/clients"),
                get("/services"), get("/users")
            ])
            setAppointments(appointments)
            setClients(clients)
            setServices(services)
            setUsers(users)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setForm({ user_id: "", client_id: "", service_id: "", business_id: 1, date_time: "", duration_hours: 1 })
        setShowForm(false)
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            await post("/appointments", {
                ...form,
                user_id: parseInt(form.user_id),
                client_id: parseInt(form.client_id),
                service_id: parseInt(form.service_id),
            })
            await fetchAll()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error creating appointment")
        }
    }

    const handleStatus = async (id: number, status: AppointmentStatus) => {
        try {
            await put(`/appointments/${id}`, { status })
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const statusColor = (status: AppointmentStatus): string => {
        const colors: Record<AppointmentStatus, string> = {
            pending: "bg-amber-900/50 text-amber-300 border border-amber-800",
            confirmed: "bg-blue-900/50 text-blue-300 border border-blue-800",
            completed: "bg-green-900/50 text-green-300 border border-green-800",
            cancelled: "bg-red-900/50 text-red-300 border border-red-800"
        }
        return colors[status]
    }

    const statusLabel = (status: AppointmentStatus): string => {
        const labels: Record<AppointmentStatus, string> = {
            pending: "Pending",
            confirmed: "Confirmed",
            completed: "Completed",
            cancelled: "Cancelled"
        }
        return labels[status]
    }

    const filtered = appointments.filter(a => {
        const matchUser = filterUser ? a.user_id === parseInt(filterUser) : true
        const matchDate = filterDate ? a.date_time.startsWith(filterDate) : true
        return matchUser && matchDate
    })

    const inputClass = "w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"

    useEffect(() => { fetchAll() }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading...</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-slate-200">Appointments</h1>
                    <p className="text-sm text-slate-400 mt-1">{appointments.length} registered appointments</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    + New appointment
                </button>
            </div>

            {showForm && (
                <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-base font-medium text-slate-200 mb-4">New appointment</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Client</label>
                            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputClass} required>
                                <option value="">Select client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Service</label>
                            <select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className={inputClass} required>
                                <option value="">Select service</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name} — €{s.price}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Employee</label>
                            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className={inputClass} required>
                                <option value="">Select employee</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.username} — {u.role}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Date and time</label>
                            <input type="datetime-local" value={form.date_time} onChange={(e) => setForm({ ...form, date_time: e.target.value })} className={inputClass} required />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Duration (hours)</label>
                            <input type="number" min="1" max="8" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) })} className={inputClass} />
                        </div>
                        {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
                        <div className="col-span-2 flex gap-3 justify-end">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                Create appointment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex gap-4 mb-6">
                <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className={inputClass}
                >
                    <option value="">All employees</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>

                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className={inputClass}
                />

                {(filterUser || filterDate && (
                    <button
                        onClick={() => { setFilterUser(""); setFilterDate("") }}
                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        Clear filters
                    </button>
                ))}
            </div>

            <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="border-b border-slate-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Client</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Service</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Employee</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Date</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {appointments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500">No appointments registered</td>
                                </tr>
                            ) : (
                                filtered.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">{a.client_name}</td>
                                        <td className="px-6 py-4 text-slate-400">{a.service_name}</td>
                                        <td className="px-6 py-4 text-slate-400">{a.user_name}</td>
                                        <td className="px-6 py-4 text-slate-400">{new Date(a.date_time).toLocaleString("en-GB")}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                                                {statusLabel(a.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex gap-3 justify-end">
                                            {a.status === "pending" && (
                                                <button
                                                    onClick={() => setConfirmModal({ id: a.id, status: "confirmed", label: "confirmed" })}
                                                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {a.status === "confirmed" && (
                                                <button
                                                    onClick={() => setConfirmModal({ id: a.id, status: "completed", label: "completed" })}
                                                    className="text-green-400 hover:text-green-300 font-medium transition-colors"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {["pending", "confirmed"].includes(a.status) && (
                                                <button
                                                    onClick={() => setConfirmModal({ id: a.id, status: "cancelled", label: "cancelled" })}
                                                    className="text-red-400 hover:text-red-300 font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {["completed", "cancelled"].includes(a.status) && (
                                                <span className="text-slate-600 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {confirmModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setConfirmModal(null)}
                >
                    <div
                        className="bg-[#161b27] border border-slate-700 rounded-xl p-6 w-full max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-medium text-slate-200 mb-2">Confirm action</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Are you sure you want to mark this appointment as <span className="text-slate-200 font-medium">{confirmModal.label}</span>?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleStatus(confirmModal.id, confirmModal.status)
                                    setConfirmModal(null)
                                }}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Appointments