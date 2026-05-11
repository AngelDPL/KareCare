import { useState, useEffect } from "react"
import { get, post, del } from "../services/api"
import type { Budget, Client, Service, BudgetStatus } from "../types"

interface BudgetForm {
    client_id: string
    business_id: number
    notes: string
    valid_until: string
    items: FormItem[]
}

interface FormItem {
    description: string
    quantity: number
    unit_price: number
    subtotal: number
    service_id: number | null
}

interface NewItem {
    description: string
    quantity: string
    unit_price: string
    service_id: string
}

const Budgets = () => {
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [expanded, setExpanded] = useState<number | null>(null)
    const [sending, setSending] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<BudgetForm>({
        client_id: "", business_id: 1, notes: "", valid_until: "", items: []
    })
    const [newItem, setNewItem] = useState<NewItem>({
        description: "", quantity: "1", unit_price: "", service_id: ""
    })
    const [sendModal, setSendModal] = useState<number | null>(null)


    const fetchAll = async () => {
        try {
            const [buds, cls, svcs] = await Promise.all([
                get("/budgets"), get("/clients"), get("/services")
            ])
            setBudgets(buds)
            setClients(cls)
            setServices(svcs)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddItem = () => {
        if (!newItem.description || !newItem.unit_price) return
        const quantity = parseInt(newItem.quantity)
        const unit_price = parseFloat(newItem.unit_price)
        const subtotal = quantity * unit_price
        setForm({
            ...form,
            items: [...form.items, {
                ...newItem, quantity, unit_price, subtotal,
                service_id: newItem.service_id ? parseInt(newItem.service_id) : null
            }]
        })
        setNewItem({ description: "", quantity: "1", unit_price: "", service_id: "" })
    }

    const handleRemoveItem = (index: number) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
    }

    const handleServiceSelect = (service_id: string) => {
        if (!service_id) {
            setNewItem({ ...newItem, service_id: "", description: "", unit_price: "" })
            return
        }
        const service = services.find(s => s.id === parseInt(service_id))
        if (service) {
            setNewItem({ ...newItem, service_id: String(service.id), description: service.name, unit_price: service.price })
        }
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        if (form.items.length === 0) { setError("Add at least one item"); return }
        try {
            await post("/budgets", { ...form, client_id: parseInt(form.client_id) })
            await fetchAll()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error creating budget")
        }
    }

    const handleSend = async (id: number) => {
        setSendModal(null)
        setSending(id)
        try {
            await post(`/budgets/${id}/send`, {})
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        } finally {
            setSending(null)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this budget?")) return
        try {
            await del(`/budgets/${id}`)
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const resetForm = () => {
        setForm({ client_id: "", business_id: 1, notes: "", valid_until: "", items: [] })
        setNewItem({ description: "", quantity: "1", unit_price: "", service_id: "" })
        setShowForm(false)
        setError(null)
    }

    const totalForm = form.items.reduce((acc, item) => acc + item.subtotal, 0)

    const statusLabel = (status: BudgetStatus): string => {
        const labels: Record<BudgetStatus, string> = {
            draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected"
        }
        return labels[status]
    }

    const statusColor = (status: BudgetStatus): string => {
        const colors: Record<BudgetStatus, string> = {
            draft: "bg-slate-800 text-slate-300 border border-slate-700",
            sent: "bg-blue-900/50 text-blue-300 border border-blue-800",
            accepted: "bg-green-900/50 text-green-300 border border-green-800",
            rejected: "bg-red-900/50 text-red-300 border border-red-800"
        }
        return colors[status]
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
                    <h1 className="text-xl font-medium text-slate-200">Budgets</h1>
                    <p className="text-sm text-slate-400 mt-1">{budgets.length} registered budgets</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    + New budget
                </button>
            </div>

            {showForm && (
                <div className="bg-[#161b27] border border-slate-700 rounded-xl p-4 lg:p-6 mb-6">
                    <h2 className="text-base font-medium text-slate-200 mb-4">New budget</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Client</label>
                                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputClass} required>
                                    <option value="">Select client</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Valid until</label>
                                <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className={inputClass} />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} placeholder="Additional notes for the client..." />
                            </div>
                        </div>

                        <div className="border border-slate-700 rounded-xl p-4">
                            <h3 className="text-sm font-medium text-slate-300 mb-3">Add treatment</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Service (optional)</label>
                                    <select value={newItem.service_id} onChange={(e) => handleServiceSelect(e.target.value)} className={inputClass}>
                                        <option value="">Custom</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Description</label>
                                    <input type="text" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className={inputClass} placeholder="Treatment description" />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Qty</label>
                                    <input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Unit price (€)</label>
                                    <input type="number" min="0" step="0.01" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} className={inputClass} placeholder="0.00" />
                                </div>
                            </div>
                            <button type="button" onClick={handleAddItem} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                + Add item
                            </button>
                        </div>

                        {form.items.length > 0 && (
                            <div className="border border-slate-700 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[500px]">
                                        <thead className="border-b border-slate-700 bg-slate-800/50">
                                            <tr>
                                                <th className="text-left px-4 py-2 text-slate-500 font-medium text-xs uppercase">Description</th>
                                                <th className="text-center px-4 py-2 text-slate-500 font-medium text-xs uppercase">Qty</th>
                                                <th className="text-right px-4 py-2 text-slate-500 font-medium text-xs uppercase">Price</th>
                                                <th className="text-right px-4 py-2 text-slate-500 font-medium text-xs uppercase">Subtotal</th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {form.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 text-slate-200">{item.description}</td>
                                                    <td className="px-4 py-2 text-center text-slate-400">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-slate-400">€{item.unit_price}</td>
                                                    <td className="px-4 py-2 text-right font-medium text-slate-200">€{item.subtotal.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300 transition-colors">✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-800/50">
                                                <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-400 text-xs uppercase tracking-wider">Total</td>
                                                <td className="px-4 py-2 text-right font-semibold text-indigo-400">€{totalForm.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Create budget</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="border-b border-slate-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">#</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Client</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Total</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Valid until</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500">No budgets registered</td>
                                </tr>
                            ) : (
                                budgets.map(b => (
                                    <>
                                        <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{String(b.id).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 font-medium text-slate-200">{b.client_name}</td>
                                            <td className="px-6 py-4 font-semibold text-indigo-400">€{b.total}</td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {b.valid_until ? new Date(b.valid_until).toLocaleDateString("en-GB") : "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(b.status)}`}>
                                                    {statusLabel(b.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-3 justify-end">
                                                    <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-slate-400 hover:text-slate-200 font-medium transition-colors">
                                                        {expanded === b.id ? "▲ Items" : "▼ Items"}
                                                    </button>
                                                    {b.status === "draft" && (
                                                        <button
                                                            onClick={() => setSendModal(b.id)}
                                                            disabled={sending === b.id}
                                                            className="text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 transition-colors"
                                                        >
                                                            {sending === b.id ? "Sending..." : "Send"}
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded === b.id && (
                                            <tr key={`items-${b.id}`}>
                                                <td colSpan={6} className="px-6 py-3 bg-slate-800/30 border-b border-slate-800">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs min-w-[400px]">
                                                            <thead>
                                                                <tr className="text-slate-500">
                                                                    <th className="text-left py-1">Description</th>
                                                                    <th className="text-center py-1">Qty</th>
                                                                    <th className="text-right py-1">Price</th>
                                                                    <th className="text-right py-1">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {b.items.map(item => (
                                                                    <tr key={item.id}>
                                                                        <td className="py-1 text-slate-300">{item.description}</td>
                                                                        <td className="py-1 text-center text-slate-400">{item.quantity}</td>
                                                                        <td className="py-1 text-right text-slate-400">€{item.unit_price}</td>
                                                                        <td className="py-1 text-right font-medium text-slate-200">€{item.subtotal}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {b.notes && <p className="text-xs text-slate-500 mt-2">Notes: {b.notes}</p>}
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

            {sendModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setSendModal(null)}
                >
                    <div
                        className="bg-[#161b27] border border-slate-700 rounded-xl p-6 w-full max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-medium text-slate-200 mb-2">Send budget</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Are you sure you want to send this budget to the client via email?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setSendModal(null)}
                                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSend(sendModal)}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Budgets