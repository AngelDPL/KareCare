import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"

const Payments = () => {
    const [abonoMethod, setAbonoMethod] = useState("cash")
    const [payments, setPayments] = useState([])
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [showAbono, setShowAbono] = useState(null)
    const [expanded, setExpanded] = useState(null)
    const [error, setError] = useState(null)
    const [abonoAmount, setAbonoAmount] = useState("")
    const [form, setForm] = useState({
        client_id: "",
        payment_method: "cash",
        estimated_total: "",
        payments_made: "0",
        payment_date: ""
    })

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        try {
            const [pays, cls] = await Promise.all([
                get("/payments"),
                get("/clients")
            ])
            setPayments(pays)
            setClients(cls)
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
            await post("/payments", {
                ...form,
                client_id: parseInt(form.client_id)
            })
            await fetchAll()
            resetForm()
        } catch (err) {
            setError(err.error || "Error al crear pago")
        }
    }

    const handleAbono = async (id) => {
        try {
            await post(`/payments/${id}/add-payment`, {
                amount: abonoAmount,
                payment_method: abonoMethod,
                payment_date: new Date().toISOString().split("T")[0]
            })
            await fetchAll()
            setShowAbono(null)
            setAbonoAmount("")
            setAbonoMethod("cash")
        } catch (err) {
            console.error(err)
        }
    }

    const handleDeletePayment = async (id) => {
        if (!confirm("¿Eliminar este pago completo?")) return
        try {
            await del(`/payments/${id}`)
            await fetchAll()
        } catch (err) {
            console.error(err)
        }
    }

    const handleDeleteHistory = async (historyId) => {
        if (!confirm("¿Eliminar este abono?")) return
        try {
            await del(`/payments/abono/${historyId}`)
            await fetchAll()
        } catch (err) {
            console.error(err)
        }
    }

    const resetForm = () => {
        setForm({ client_id: "", payment_method: "cash", estimated_total: "", payments_made: "0", payment_date: "" })
        setShowForm(false)
        setError(null)
    }

    const statusColor = (status) => {
        return status === "paid"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
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
                        <h1 className="text-2xl font-bold text-gray-800">Pagos</h1>
                        <p className="text-gray-500 text-sm mt-1">{payments.length} pagos registrados</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + Nuevo pago
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nuevo pago</h2>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                                <select
                                    value={form.payment_method}
                                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="cash">Efectivo</option>
                                    <option value="card">Tarjeta</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total estimado (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.estimated_total}
                                    onChange={(e) => setForm({ ...form, estimated_total: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pago inicial (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.payments_made}
                                    onChange={(e) => setForm({ ...form, payments_made: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
                                <input
                                    type="date"
                                    value={form.payment_date}
                                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
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
                                    Crear pago
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
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Método</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Total</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cobrado</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Pendiente</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Estado</th>
                                <th className="text-right px-6 py-3 text-gray-500 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        No hay pagos registrados
                                    </td>
                                </tr>
                            ) : (
                                payments.map(p => (
                                    <>
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {clients.find(c => c.id === p.client_id)?.name ?? "—"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {p.payment_method === "cash" ? "Efectivo" : "Tarjeta"}
                                            </td>
                                            <td className="px-6 py-4 text-gray-800 font-medium">€{p.estimated_total}</td>
                                            <td className="px-6 py-4 text-green-600 font-medium">€{p.payments_made}</td>
                                            <td className="px-6 py-4 text-red-500 font-medium">€{p.pending_payments}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                                                    {p.status === "paid" ? "Pagado" : "Pendiente"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-3 justify-end">
                                                    {p.history && p.history.length > 0 && (
                                                        <button
                                                            onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                                                            className="text-gray-500 hover:text-gray-700 font-medium"
                                                        >
                                                            {expanded === p.id ? "▲ Historial" : "▼ Historial"}
                                                        </button>
                                                    )}
                                                    {p.status === "pending" && (
                                                        <button
                                                            onClick={() => setShowAbono(p.id)}
                                                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                        >
                                                            Abonar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeletePayment(p.id)}
                                                        className="text-red-500 hover:text-red-700 font-medium"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {showAbono === p.id && (
                                            <tr key={`abono-${p.id}`}>
                                                <td colSpan="7" className="px-6 py-4 bg-indigo-50">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="Monto del abono"
                                                            value={abonoAmount}
                                                            onChange={(e) => setAbonoAmount(e.target.value)}
                                                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                        />
                                                        <select
                                                            value={abonoMethod}
                                                            onChange={(e) => setAbonoMethod(e.target.value)}
                                                            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                        >
                                                            <option value="cash">Efectivo</option>
                                                            <option value="card">Tarjeta</option>
                                                        </select>
                                                        <button
                                                            onClick={() => handleAbono(p.id)}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                                                        >
                                                            Registrar abono
                                                        </button>
                                                        <button
                                                            onClick={() => setShowAbono(null)}
                                                            className="text-gray-500 text-sm hover:text-gray-700"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {expanded === p.id && p.history && p.history.length > 0 && (
                                            <tr key={`history-${p.id}`}>
                                                <td colSpan="7" className="px-6 py-3 bg-gray-50">
                                                    <p className="text-xs font-medium text-gray-500 mb-2">Historial de abonos:</p>
                                                    <div className="flex flex-col gap-1">
                                                        {p.history.map(h => (
                                                            <div key={h.id} className="flex gap-4 text-xs text-gray-600 items-center">
                                                                <span>{new Date(h.created_at).toLocaleString("es-ES")}</span>
                                                                <span className="font-medium text-green-600">+€{h.amount}</span>
                                                                <span>{h.payment_method === "cash" ? "Efectivo" : "Tarjeta"}</span>
                                                                <button
                                                                    onClick={() => handleDeleteHistory(h.id)}
                                                                    className="text-red-400 hover:text-red-600 ml-2"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    )
}

export default Payments