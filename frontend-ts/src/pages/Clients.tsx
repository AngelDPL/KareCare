import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"
import type { Client } from "../types"

interface ClientForm {
    name: string,
    phone: string,
    email: string,
    client_dni: string,
    address: string,
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
            setError(err.error || "Error al guardar cliente")
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
        if (!confirm("¿Eliminar este cliente?")) return
        try {
            await del(`/clients/${id}`)
            await fetchClients()
        } catch (err: any) {
            setError(err.error || "Error al borrar cliente")
        }
    }

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.client_dni.toLowerCase().includes(search.toLowerCase())
    )

    
    useEffect(() => {
        fetchClients()
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
                        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
                        <p className="text-gray-500 text-sm mt-1">{clients.length} registered customers</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + New client
                    </button>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            {selected ? "Edit client" : "New client"}
                        </h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                                <input
                                    type="text"
                                    value={form.client_dni}
                                    onChange={(e) => setForm({ ...form, client_dni: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                                    {selected ? "Save changes" : "Create client"}
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
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">DNI</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Phone</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                                <th className="text-left px-6 py-3 text-gray-500 font-medium">ID</th>
                                <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-400">
                                        There are no registered customers
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(client => (
                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{client.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{client.client_dni}</td>
                                        <td className="px-6 py-4 text-gray-600">{client.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{client.email}</td>
                                        <td className="px-6 py-4 text-gray-400">{client.client_id_number}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium mr-4"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="text-red-500 hover:text-red-700 font-medium"
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