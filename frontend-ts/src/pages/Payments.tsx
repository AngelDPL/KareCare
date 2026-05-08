import { useState, useEffect } from "react"
import { get, post, del } from "../services/api"
import type { Payment, Client, PaymentMethods, PaymentStatus } from "../types"

interface PaymentForm {
    client_id: string
    payment_method: PaymentMethods
    estimated_total: string
    payments_made: string
    payment_date: string
}

const Payments = () => {
    const [payments, setPayments] = useState<Payment[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [showAbono, setShowAbono] = useState<number | null>(null)
    const [expanded, setExpanded] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [abonoAmount, setAbonoAmount] = useState<string>("")
    const [abonoMethod, setAbonoMethod] = useState<PaymentMethods>("cash")
    const [form, setForm] = useState<PaymentForm>({
        client_id: "", payment_method: "cash",
        estimated_total: "", payments_made: "0", payment_date: ""
    })

    const fetchAll = async () => {
        try {
            const [pays, cls] = await Promise.all([get("/payments"), get("/clients")])
            setPayments(pays)
            setClients(cls)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setForm({ client_id: "", payment_method: "cash", estimated_total: "", payments_made: "0", payment_date: "" })
        setShowForm(false)
        setError(null)
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            await post("/payments", { ...form, client_id: parseInt(form.client_id) })
            await fetchAll()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error creating payment")
        }
    }

    const handleAbono = async (id: number) => {
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
        } catch (err: any) {
            console.error(err)
        }
    }

    const handleDeletePayment = async (id: number) => {
        if (!confirm("Delete this payment?")) return
        try {
            await del(`/payments/${id}`)
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const handleDeleteHistory = async (historyId: number) => {
        if (!confirm("Delete this entry?")) return
        try {
            await del(`/payments/abono/${historyId}`)
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const statusColor = (status: PaymentStatus): string => {
        return status === "paid"
            ? "bg-green-900/50 text-green-300 border border-green-800"
            : "bg-amber-900/50 text-amber-300 border border-amber-800"
    }

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
                    <h1 className="text-xl font-medium text-slate-200">Payments</h1>
                    <p className="text-sm text-slate-400 mt-1">{payments.length} registered payments</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    + New payment
                </button>
            </div>

            {showForm && (
                <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-base font-medium text-slate-200 mb-4">New payment</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Client</label>
                            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputClass} required>
                                <option value="">Select client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Payment method</label>
                            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethods })} className={inputClass}>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Estimated total (€)</label>
                            <input type="number" min="0" step="0.01" value={form.estimated_total} onChange={(e) => setForm({ ...form, estimated_total: e.target.value })} className={inputClass} required />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Initial payment (€)</label>
                            <input type="number" min="0" step="0.01" value={form.payments_made} onChange={(e) => setForm({ ...form, payments_made: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Payment date</label>
                            <input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className={inputClass} />
                        </div>
                        {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
                        <div className="col-span-2 flex gap-3 justify-end">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create payment</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead className="border-b border-slate-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Client</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Method</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Total</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Collected</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Pending</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500">No payments registered</td>
                                </tr>
                            ) : (
                                payments.map(p => (
                                    <>
                                        <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-200">
                                                {clients.find(c => c.id === p.client_id)?.name ?? "—"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {p.payment_method === "cash" ? "Cash" : "Card"}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-200">€{p.estimated_total}</td>
                                            <td className="px-6 py-4 text-green-400 font-medium">€{p.payments_made}</td>
                                            <td className="px-6 py-4 text-red-400 font-medium">€{p.pending_payments}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                                                    {p.status === "paid" ? "Paid" : "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-3 justify-end">
                                                    {p.history && p.history.length > 0 && (
                                                        <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-slate-400 hover:text-slate-200 font-medium transition-colors">
                                                            {expanded === p.id ? "▲ History" : "▼ History"}
                                                        </button>
                                                    )}
                                                    {p.status === "pending" && (
                                                        <button onClick={() => setShowAbono(p.id)} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                                            Add payment
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {showAbono === p.id && (
                                            <tr key={`abono-${p.id}`}>
                                                <td colSpan={7} className="px-6 py-4 bg-indigo-950/30 border-b border-slate-800">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="number" min="0" step="0.01"
                                                            placeholder="Amount"
                                                            value={abonoAmount}
                                                            onChange={(e) => setAbonoAmount(e.target.value)}
                                                            className="bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                                                        />
                                                        <select value={abonoMethod} onChange={(e) => setAbonoMethod(e.target.value as PaymentMethods)} className="bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                                            <option value="cash">Cash</option>
                                                            <option value="card">Card</option>
                                                        </select>
                                                        <button onClick={() => handleAbono(p.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                                                            Register payment
                                                        </button>
                                                        <button onClick={() => setShowAbono(null)} className="text-slate-400 text-sm hover:text-slate-200 transition-colors">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {expanded === p.id && p.history && p.history.length > 0 && (
                                            <tr key={`history-${p.id}`}>
                                                <td colSpan={7} className="px-6 py-3 bg-slate-800/30 border-b border-slate-800">
                                                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Payment history</p>
                                                    <div className="flex flex-col gap-2">
                                                        {p.history.map(h => (
                                                            <div key={h.id} className="flex gap-4 text-xs text-slate-400 items-center">
                                                                <span>{new Date(h.created_at).toLocaleString("en-GB")}</span>
                                                                <span className="font-medium text-green-400">+€{h.amount}</span>
                                                                <span>{h.payment_method === "cash" ? "Cash" : "Card"}</span>
                                                                <button onClick={() => handleDeleteHistory(h.id)} className="text-red-400 hover:text-red-300 ml-2 transition-colors">✕</button>
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