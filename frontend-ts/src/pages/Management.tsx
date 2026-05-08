import { useState, useEffect } from "react"
import { get, post, put, del } from "../services/api"
import type { Business, User, UserRole } from "../types"

interface ManagementForm {
    username: string
    password: string
    role: UserRole
    business_id: number
    security_question: string
    security_answer: string
}

interface BusinessForm {
    business_name: string
    business_RIF: string
    business_CP: string
}

const Management = () => {

    const [tab, setTab] = useState<"employees" | "businesses">("employees")
    const [users, setUsers] = useState<User[]>([])
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [showForm, setShowForm] = useState<boolean>(false)
    const [selected, setSelected] = useState<User | Business | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [userForm, setUserForm] = useState<ManagementForm>({
        username: "", password: "", role: "employee" as UserRole,
        business_id: 1, security_question: "", security_answer: ""
    })
    const [businessForm, setBusinessForm] = useState<BusinessForm>({
        business_name: "", business_RIF: "", business_CP: ""
    })

    const fetchAll = async () => {
        try {
            const [users, businesses] = await Promise.all([
                get("/users"),
                get("/businesses")
            ])
            setUsers(users)
            setBusinesses(businesses)
        } catch (err: any) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleUserSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            if (selected) {
                await put(`/users/${selected.id}`, userForm)
            } else {
                await post("/users", userForm)
            }
            await fetchAll()
            resetForms()
        } catch (err: any) {
            setError(err.error || "Error al guardar empleado")
        }
    }

    const handleDeleteUser = async (id: number) => {
        if (!confirm("¿Delete this employee?")) return
        try {
            await del(`/users/${id}`)
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const handleEditUser = (user: User) => {
        setSelected(user)
        setUserForm({
            username: user.username,
            password: "",
            role: user.role,
            business_id: user.business_id,
            security_question: user.security_question,
            security_answer: ""
        })
        setShowForm(true)
    }

    const handleBusinessSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        try {
            if (selected) {
                await put(`/businesses/${selected.id}`, businessForm)
            } else {
                await post("/businesses", businessForm)
            }
            await fetchAll()
            resetForms()
        } catch (err: any) {
            setError(err.error || "Error saving business")
        }
    }

    const handleDeleteBusiness = async (id: number) => {
        if (!confirm("¿Delete this business?")) return
        try {
            await del(`/businesses/${id}`)
            await fetchAll()
        } catch (err: any) {
            console.error(err)
        }
    }

    const handleEditBusiness = (business: Business) => {
        setSelected(business)
        setBusinessForm({
            business_name: business.name,
            business_RIF: business.RIF,
            business_CP: business.CP
        })
        setShowForm(true)
    }

    const resetForms = () => {
        setSelected(null)
        setShowForm(false)
        setError(null)
        setUserForm({ username: "", password: "", role: "employee" as UserRole, business_id: 1, security_question: "", security_answer: "" })
        setBusinessForm({ business_name: "", business_RIF: "", business_CP: "" })
    }

    const roleLabel = (role: UserRole): string => {
        const labels: Record<UserRole, string> = {
            master: "Master",
            manager: "Manager",
            employee: "Employee"
        }
        return labels[role]
    }

    const roleColor = (role: UserRole) => {
        switch (role) {
            case "master": return "bg-purple-100 text-purple-700"
            case "manager": return "bg-blue-100 text-blue-700"
            case "employee": return "bg-gray-100 text-gray-700"
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

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manages employees and businesses</p>
                </div>

                <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6 w-fit">
                    <button
                        onClick={() => { setTab("employees"); resetForms() }}
                        className={`px-6 py-2 text-sm font-medium transition-colors ${tab === "employees"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        Employees ({users.length})
                    </button>
                    <button
                        onClick={() => { setTab("businesses"); resetForms() }}
                        className={`px-6 py-2 text-sm font-medium transition-colors ${tab === "businesses"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        Business ({businesses.length})
                    </button>
                </div>

                {tab === "employees" && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                + New employee
                            </button>
                        </div>

                        {showForm && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                                    {selected ? "Edit employee" : "New employee"}
                                </h2>
                                <form onSubmit={handleUserSubmit} className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                                        <input
                                            type="text"
                                            value={userForm.username}
                                            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {selected ? "New password (optional)" : "Password"}
                                        </label>
                                        <input
                                            type="password"
                                            value={userForm.password}
                                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required={!selected}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                        <select
                                            value={userForm.role}
                                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="manager">Manager</option>
                                            <option value="master">Master</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                                        <select
                                            value={userForm.business_id}
                                            onChange={(e) => setUserForm({ ...userForm, business_id: parseInt(e.target.value) })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            {businesses.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Security question</label>
                                        <input
                                            type="text"
                                            value={userForm.security_question}
                                            onChange={(e) => setUserForm({ ...userForm, security_question: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required={!selected}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Security response</label>
                                        <input
                                            type="text"
                                            value={userForm.security_answer}
                                            onChange={(e) => setUserForm({ ...userForm, security_answer: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required={!selected}
                                        />
                                    </div>
                                    {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
                                    <div className="col-span-2 flex gap-3 justify-end">
                                        <button type="button" onClick={resetForms}
                                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Cancel
                                        </button>
                                        <button type="submit"
                                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                            {selected ? "Save changes" : "Create employee"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">User</th>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">Role</th>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">Business</th>
                                        <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-400">
                                                There are no registered employees
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{user.username}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                                                        {roleLabel(user.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {businesses.find(b => b.id === user.business_id)?.name ?? "—"}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium mr-4"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
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
                    </>
                )}

                {tab === "businesses" && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                + New business
                            </button>
                        </div>

                        {showForm && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                                    {selected ? "Edit business" : "New business"}
                                </h2>
                                <form onSubmit={handleBusinessSubmit} className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={businessForm.business_name}
                                            onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">RIF</label>
                                        <input
                                            type="text"
                                            value={businessForm.business_RIF}
                                            onChange={(e) => setBusinessForm({ ...businessForm, business_RIF: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Zip code</label>
                                        <input
                                            type="text"
                                            value={businessForm.business_CP}
                                            onChange={(e) => setBusinessForm({ ...businessForm, business_CP: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            required
                                        />
                                    </div>
                                    {error && <p className="col-span-3 text-red-500 text-sm">{error}</p>}
                                    <div className="col-span-3 flex gap-3 justify-end">
                                        <button type="button" onClick={resetForms}
                                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Cancel
                                        </button>
                                        <button type="submit"
                                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                            {selected ? "Save changes" : "Create business"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">RIF</th>
                                        <th className="text-left px-6 py-3 text-gray-500 font-medium">ZC</th>
                                        <th className="text-right px-6 py-3 text-gray-500 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {businesses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-400">
                                                There are no registered businesses
                                            </td>
                                        </tr>
                                    ) : (
                                        businesses.map(business => (
                                            <tr key={business.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{business.name}</td>
                                                <td className="px-6 py-4 text-gray-600">{business.RIF}</td>
                                                <td className="px-6 py-4 text-gray-600">{business.CP}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditBusiness(business)}
                                                        className="text-indigo-600 hover:text-indigo-800 font-medium mr-4"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBusiness(business.id)}
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
                    </>
                )}

            </div>
        </div>
    )
}

export default Management