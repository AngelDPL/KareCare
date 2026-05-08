import { useState, useEffect } from "react"
import { get, post, del } from "../services/api"
import type { Budget, Client, Service, BudgetStatus } from "../types"

interface BudgetForm {
    client_id: string,
    business_id: number,
    notes: string,
    valid_until: string,
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
        client_id: "",
        business_id: 1,
        notes: "",
        valid_until: "",
        items: []
    })
    const [newItem, setNewItem] = useState<NewItem>({
        description: "",
        quantity: "1",
        unit_price: "",
        service_id: ""
    })

    const fetchAll = async () => {
        try {
            const [budgets, clients, services] = await Promise.all([
                get("/budgets"),
                get("/clients"),
                get("/services")
            ])
            setBudgets(budgets)
            setClients(clients)
            setServices(services)
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
                ...newItem,
                quantity,
                unit_price,
                subtotal,
                service_id: newItem.service_id ? parseInt(newItem.service_id) : null
            }]
        })
        setNewItem({ description: "", quantity: "1", unit_price: "", service_id: "" })
    }

    const handleRemoveItem = (index: number) => {
        setForm({
            ...form,
            items: form.items.filter((_, i) => i !== index)
        })
    }

    const handleServiceSelect = (service_id: string) => {
        if (!service_id) {
            setNewItem({ ...newItem, service_id: "", description: "", unit_price: "" })
            return
        }
        const service = services.find(s => s.id === parseInt(service_id))
        if (service) {
            setNewItem({
                ...newItem,
                service_id: String(service.id),
                description: service.name,
                unit_price: service.price
            })
        }
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        if (form.items.length === 0) {
            setError("Add at least one item to the budget")
            return
        }
        try {
            await post("/budgets", {
                ...form,
                client_id: parseInt(form.client_id)
            })
            await fetchAll()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error creating quote")
        }
    }

    const handleSend = async (id: number) => {
        if (!confirm("¿Send quote to customer via email?")) return
        setSending(id)
        try {
            await post(`/budgets/${id}/send`, {})
            await fetchAll()
        } catch (err) {
            console.error(err)
        } finally {
            setSending(null)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("¿Delete this quote?")) return
        try {
            await del(`/budgets/${id}`)
            await fetchAll()
        } catch (err) {
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
            draft: "Draft",
            sent: "Sent",
            accepted: "Accepted",
            rejected: "Rejected"
        }
        return labels[status]
    }

    const statusColor = (status: BudgetStatus): string => {
        switch (status) {
            case "draft": return "bg-gray-100 text-gray-700"
            case "sent": return "bg-blue-100 text-blue-700"
            case "accepted": return "bg-green-100 text-green-700"
            case "rejected": return "bg-red-100 text-red-700"
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
                        <h1 className="text-2xl font-bold text-gray-800">Budgets</h1>
                        <p className="text-gray-500 text-sm mt-1">{budgets.length} registered budgets</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + New budget
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">New budget</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid until</label>
                                    <input
                                        type="date"
                                        value={form.valid_until}
                                        onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        placeholder="Additional notes for the client..."
                                    />
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add treatment</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Service (optional)</label>
                                        <select
                                            value={newItem.service_id}
                                            onChange={(e) => handleServiceSelect(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            <option value="">Personalized</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            placeholder="Treatment description"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Unit price (€)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newItem.unit_price}
                                            onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    + Add item
                                </button>
                            </div>

                            {form.items.length > 0 && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-4 py-2 text-gray-500 font-medium">Description</th>
                                                <th className="text-center px-4 py-2 text-gray-500 font-medium">Qty.</th>
                                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Price</th>
                                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Subtotal</th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {form.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 text-gray-800">{item.description}</td>
                                                    <td className="px-4 py-2 text-center text-gray-600">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right text-gray-600">€{item.unit_price}</td>
                                                    <td className="px-4 py-2 text-right font-medium text-gray-800">€{item.subtotal.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="text-red-400 hover:text-red-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50">
                                                <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">TOTAL</td>
                                                <td className="px-4 py-2 text-right font-bold text-indigo-600">€{totalForm.toFixed(2)}</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <div className="flex gap-3 justify-end">
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
                                    Create quote
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Client</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Total</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Valid until</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                                <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-400">
                                        There are no registered budgets
                                    </td>
                                </tr>
                            ) : (
                                budgets.map(b => (
                                    <>
                                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-mono">#{String(b.id).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{b.client_name}</td>
                                            <td className="px-6 py-4 font-bold text-indigo-600">€{b.total}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {b.valid_until ? new Date(b.valid_until).toLocaleDateString("es-ES") : "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(b.status)}`}>
                                                    {statusLabel(b.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-3 justify-end">
                                                    <button
                                                        onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                                                        className="text-gray-500 hover:text-gray-700 font-medium"
                                                    >
                                                        {expanded === b.id ? "▲ Items" : "▼ Items"}
                                                    </button>
                                                    {b.status === "draft" && (
                                                        <button
                                                            onClick={() => handleSend(b.id)}
                                                            disabled={sending === b.id}
                                                            className="text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                                                        >
                                                            {sending === b.id ? "Sending..." : "Send"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(b.id)}
                                                        className="text-red-500 hover:text-red-700 font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded === b.id && (
                                            <tr key={`items-${b.id}`}>
                                                <td colSpan={6} className="px-6 py-3 bg-gray-50">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="text-gray-500">
                                                                <th className="text-left py-1">Description</th>
                                                                <th className="text-center py-1">Qty.</th>
                                                                <th className="text-right py-1">Price</th>
                                                                <th className="text-right py-1">Subtotal</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {b.items.map(item => (
                                                                <tr key={item.id}>
                                                                    <td className="py-1 text-gray-700">{item.description}</td>
                                                                    <td className="py-1 text-center text-gray-600">{item.quantity}</td>
                                                                    <td className="py-1 text-right text-gray-600">€{item.unit_price}</td>
                                                                    <td className="py-1 text-right font-medium text-gray-800">€{item.subtotal}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {b.notes && (
                                                        <p className="text-xs text-gray-500 mt-2">Notes: {b.notes}</p>
                                                    )}
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

export default Budgets