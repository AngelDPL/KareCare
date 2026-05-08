import { useState, useEffect } from "react"
import { get, post, put } from "../services/api"
import type { Appointment, Client, Service, User, AppointmentStatus } from "../types"

interface AppointmentForm {
    user_id: string,
    client_id: string,
    service_id: string,
    business_id: number,
    date_time: string,
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
        user_id: "",
        client_id: "",
        service_id: "",
        business_id: 1,
        date_time: "",
        duration_hours: 1
    })

    const fetchAll = async () => {
        try {
            const [appointments, clients, services, users] = await Promise.all([
                get("/appointments"),
                get("/clients"),
                get("/services"),
                get("/users")
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
            setError(err.error || "Error al crear cita")
        }
    }

    const handleStatus = async (id: number, status: AppointmentStatus) => {
        try {
            await put(`/appointments/${id}`, { status })
            await fetchAll()
        } catch (err) {
            console.error(err)
        }
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

    const statusColor = (status: AppointmentStatus): string => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-700"
            case "confirmed": return "bg-blue-100 text-blue-700"
            case "completed": return "bg-green-100 text-green-700"
            case "cancelled": return "bg-red-100 text-red-700"
            default: return "bg-gray-100 text-gray-700"
        }
    }


    useEffect(() => {
        fetchAll()
    }, [])


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Loading...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
                        <p className="text-gray-500 text-sm mt-1">{appointments.length} recorded appointments</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + New appointment
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">New appointment</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                                <select
                                    value={form.client_id}
                                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Select client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                                <select
                                    value={form.service_id}
                                    onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Select service</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} — €{s.price}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                                <select
                                    value={form.user_id}
                                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Select employee</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} — {u.role}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date and time</label>
                                <input
                                    type="datetime-local"
                                    value={form.date_time}
                                    onChange={(e) => setForm({ ...form, date_time: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (horas)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={form.duration_hours}
                                    onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
                            <div className="col-span-2 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Create appointment
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Client</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Service</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Employee</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                                <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {appointments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-400">
                                        No appointments registered
                                    </td>
                                </tr>
                            ) : (
                                appointments.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{a.client_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{a.service_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{a.user_name}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(a.date_time).toLocaleString("es-ES")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                                                {statusLabel(a.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                            {a.status === "pending" && (
                                                <button
                                                    onClick={() => handleStatus(a.id, "confirmed")}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {a.status === "confirmed" && (
                                                <button
                                                    onClick={() => handleStatus(a.id, "completed")}
                                                    className="text-green-600 hover:text-green-800 font-medium"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            {["pending", "confirmed"].includes(a.status) && (
                                                <button
                                                    onClick={() => handleStatus(a.id, "cancelled")}
                                                    className="text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Appointments