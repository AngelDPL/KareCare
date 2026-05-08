import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"
import type { Service } from "../types"

interface ServiceForm {
    name: string
    description: string
    price: string
    business_id: number
}

const Services = () => {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [selected, setSelected] = useState<Service | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<ServiceForm>({
        name: "", description: "", price: "", business_id: 1
    })

    const fetchServices = async () => {
        try {
            const data = await get("/services")
            setServices(data)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelected(null)
        setForm({ name: "", description: "", price: "", business_id: 1 })
        setShowForm(false)
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            if (selected) {
                await put(`/services/${selected.id}`, form)
            } else {
                await post("/services", form)
            }
            await fetchServices()
            resetForm()
        } catch (err: any) {
            setError(err.error || "Error saving service")
        }
    }

    const handleEdit = (service: Service) => {
        setSelected(service)
        setForm({
            name: service.name,
            description: service.description,
            price: service.price,
            business_id: service.business_id
        })
        setShowForm(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this service?")) return
        try {
            await del(`/services/${id}`)
            await fetchServices()
        } catch (err: any) {
            console.error(err)
        }
    }

    const inputClass = "w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"

    useEffect(() => { fetchServices() }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Loading...</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-medium text-slate-200">Services</h1>
                    <p className="text-sm text-slate-400 mt-1">{services.length} registered services</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    + New service
                </button>
            </div>

            {showForm && (
                <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                    <h2 className="text-base font-medium text-slate-200 mb-4">
                        {selected ? "Edit service" : "New service"}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Price (€)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className={inputClass}
                                required
                            />
                        </div>
                        {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
                        <div className="col-span-2 flex gap-3 justify-end">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                {selected ? "Save changes" : "Create service"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.length === 0 ? (
                    <div className="col-span-3 text-center py-8 text-slate-500 bg-[#161b27] border border-slate-700 rounded-xl">
                        No services registered
                    </div>
                ) : (
                    services.map(service => (
                        <div key={service.id} className="bg-[#161b27] border border-slate-700 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-medium text-slate-200">{service.name}</h3>
                                <span className="text-lg font-semibold text-indigo-400">€{service.price}</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">{service.description}</p>
                            <div className="flex gap-3 justify-end border-t border-slate-800 pt-3">
                                <button
                                    onClick={() => handleEdit(service)}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(service.id)}
                                    className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Services