import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"

const Services = () => {
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [selected, setSelected] = useState(null)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        business_id: 1
    })

    useEffect(() => {
        fetchServices()
    }, [])

    const fetchServices = async () => {
        try {
            const data = await get("/services")
            setServices(data)
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
            if (selected) {
                await put(`/services/${selected.id}`, form)
            } else {
                await post("/services", form)
            }
            await fetchServices()
            resetForm()
        } catch (err) {
            setError(err.error || "Error al guardar servicio")
        }
    }

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este servicio?")) return
        try {
            await del(`/services/${id}`)
            await fetchServices()
        } catch (err) {
            console.error(err)
        }
    }

    const handleEdit = (service) => {
        setSelected(service)
        setForm({
            name: service.name,
            description: service.description,
            price: service.price,
            business_id: service.business_id
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setSelected(null)
        setForm({ name: "", description: "", price: "", business_id: 1 })
        setShowForm(false)
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Cargando...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
                        <p className="text-gray-500 text-sm mt-1">{services.length} servicios registrados</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + Nuevo servicio
                    </button>
                </div>

                {/* Formulario */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            {selected ? "Editar servicio" : "Nuevo servicio"}
                        </h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
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
                                    {selected ? "Guardar cambios" : "Crear servicio"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Cards de servicios */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.length === 0 ? (
                        <div className="col-span-3 text-center py-8 text-gray-400 bg-white rounded-2xl">
                            No hay servicios registrados
                        </div>
                    ) : (
                        services.map(service => (
                            <div key={service.id} className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-gray-800">{service.name}</h3>
                                    <span className="text-lg font-bold text-indigo-600">€{service.price}</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    )
}

export default Services