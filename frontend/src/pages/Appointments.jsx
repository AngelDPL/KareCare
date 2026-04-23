import { useState, useEffect } from "react"
import { get, post, put } from "../services/api"

const Appointments = () => {
    const [appointments, setAppointments] = useState([])
    const [clients, setClients] = useState([])
    const [services, setServices] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        user_id: "",
        client_id: "",
        service_id: "",
        business_id: 1,
        date_time: "",
        duration_hours: 1
    })

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        try {
            const [appts, cls, svcs, usrs] = await Promise.all([
                get("/appointments"),
                get("/clients"),
                get("/services"),
                get("/users")
            ])
            setAppointments(appts)
            setClients(cls)
            setServices(svcs)
            setUsers(usrs)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
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
        } catch (err) {
            setError(err.error || "Error al crear cita")
        }
    }

    const handleStatus = async (id, status) => {
        try {
            await put(`/appointments/${id}`, { status })
            await fetchAll()
        } catch (err) {
            console.error(err)
        }
    }

    const resetForm = () => {
        setForm({ user_id: "", client_id: "", service_id: "", business_id: 1, date_time: "", duration_hours: 1 })
        setShowForm(false)
    }

    const statusColor = (status) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-700"
            case "confirmed": return "bg-blue-100 text-blue-700"
            case "completed": return "bg-green-100 text-green-700"
            case "cancelled": return "bg-red-100 text-red-700"
            default: return "bg-gray-100 text-gray-700"
        }
    }

    const statusLabel = (status) => {
        switch (status) {
            case "pending": return "Pendiente"
            case "confirmed": return "Confirmada"
            case "completed": return "Completada"
            case "cancelled": return "Cancelada"
            default: return status
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Cargando...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Citas</h1>
                        <p className="text-gray-500 text-sm mt-1">{appointments.length} citas registradas</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + Nueva cita
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nueva cita</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                                <select
                                    value={form.client_id}
                                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Seleccionar cliente</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                                <select
                                    value={form.service_id}
                                    onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Seleccionar servicio</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} — €{s.price}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
                                <select
                                    value={form.user_id}
                                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                >
                                    <option value="">Seleccionar empleado</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username} — {u.role}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
                                <input
                                    type="datetime-local"
                                    value={form.date_time}
                                    onChange={(e) => setForm({ ...form, date_time: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duración (horas)</label>
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
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Crear cita
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Servicio</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Empleado</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Fecha</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Estado</th>
                                <th className="text-right px-6 py-3 text-gray-500 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {appointments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-400">
                                        No hay citas registradas
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
                                                    Confirmar
                                                </button>
                                            )}
                                            {a.status === "confirmed" && (
                                                <button
                                                    onClick={() => handleStatus(a.id, "completed")}
                                                    className="text-green-600 hover:text-green-800 font-medium"
                                                >
                                                    Completar
                                                </button>
                                            )}
                                            {["pending", "confirmed"].includes(a.status) && (
                                                <button
                                                    onClick={() => handleStatus(a.id, "cancelled")}
                                                    className="text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    Cancelar
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