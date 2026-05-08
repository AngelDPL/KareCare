import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"
import type { Client } from "../types"

interface ClientForm {
    name: string
    phone: string
    email: string
    client_dni: string
    address: string
    business_id: number
}

const Clients = () => {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [search, setSearch] = useState<string>("")
    const [selected, setSelected] = useState<Client | null>(null)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [form, setForm] = useState<ClientForm>({
        name: "", phone: "", email: "",
        client_dni: "", address: "", business_id: 1
    })
    const [error, setError] = useState<string | null>(null)

    const fetchClients = async () => {
        try {
            const data = await get("/clients")
            setClients(data)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = (): void => {
        setSelected(null)
        setForm({ name: "", phone: "", email: "", client_dni: "", address: "", business_id: 1 })
        setShowForm(false)
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            if (selected) {
                await put(`/clients/${selected.id}`, form)
            } else {
                await post("/clients", form)
            }
            await fetchClients()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error saving client")
        }
    }

    const handleEdit = (client: Client) => {
        setSelected(client)
        setForm({
            name: client.name,
            phone: client.phone,
            email: client.email,
            client_dni: client.client_dni,
            address: client.address || "",
            business_id: client.business_id
        })
        setShowForm(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this client?")) return
        try {
            await del(`/clients/${id}`)
            await fetchClients()
        } catch (err: any) {
            console.error(err)
        }
    }

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.client_dni.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => { fetchClients() }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading...</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-slate-200">Clients</h1>
                    <p className="text-sm text-slate-400 mt-1">{clients.length} registered clients</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    + New client
                </button>
            </div>

            <input
                type="text"
                placeholder="Search by name, email or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 placeholder-slate-500 rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {showForm && (
                <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-base font-medium text-slate-200 mb-4">
                        {selected ? "Edit client" : "New client"}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Phone</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">ID number</label>
                            <input
                                type="text"
                                value={form.client_dni}
                                onChange={(e) => setForm({ ...form, client_dni: e.target.value })}
                                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Address</label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
                        <div className="col-span-2 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                {selected ? "Save changes" : "Create client"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[650px]">
                        <thead className="border-b border-slate-700">
                            <tr>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Client</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">ID number</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Phone</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Email</th>
                                <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500">
                                        No clients registered
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">{client.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{client.client_dni}</td>
                                        <td className="px-6 py-4 text-slate-400">{client.phone}</td>
                                        <td className="px-6 py-4 text-slate-400">{client.email}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="text-indigo-400 hover:text-indigo-300 font-medium mr-4 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="text-red-400 hover:text-red-300 font-medium transition-colors"
                                            >
                                                Delete
                                            </button>
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

export default Clients