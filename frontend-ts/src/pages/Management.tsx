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
            const [usrs, biz] = await Promise.all([get("/users"), get("/businesses")])
            setUsers(usrs)
            setBusinesses(biz)
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
            setError(err.error || "Error saving employee")
        }
    }

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Delete this employee?")) return
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
            username: user.username, password: "", role: user.role,
            business_id: user.business_id, security_question: user.security_question, security_answer: ""
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
        if (!confirm("Delete this business?")) return
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
            master: "Master", manager: "Manager", employee: "Employee"
        }
        return labels[role]
    }

    const roleColor = (role: UserRole): string => {
        const colors: Record<UserRole, string> = {
            master: "bg-purple-900/50 text-purple-300 border border-purple-800",
            manager: "bg-blue-900/50 text-blue-300 border border-blue-800",
            employee: "bg-slate-800 text-slate-300 border border-slate-700"
        }
        return colors[role]
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
            <div className="mb-6">
                <h1 className="text-xl font-medium text-slate-200">Management</h1>
                <p className="text-sm text-slate-400 mt-1">Manage employees and businesses</p>
            </div>

            <div className="flex rounded-lg overflow-hidden border border-slate-700 mb-6 w-fit">
                <button
                    onClick={() => { setTab("employees"); resetForms() }}
                    className={`px-6 py-2 text-sm font-medium transition-colors ${tab === "employees" ? "bg-indigo-600 text-white" : "bg-[#161b27] text-slate-400 hover:bg-slate-800"}`}
                >
                    Employees ({users.length})
                </button>
                <button
                    onClick={() => { setTab("businesses"); resetForms() }}
                    className={`px-6 py-2 text-sm font-medium transition-colors ${tab === "businesses" ? "bg-indigo-600 text-white" : "bg-[#161b27] text-slate-400 hover:bg-slate-800"}`}
                >
                    Businesses ({businesses.length})
                </button>
            </div>

            {tab === "employees" && (
                <>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                            + New employee
                        </button>
                    </div>

                    {showForm && (
                        <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                            <h2 className="text-base font-medium text-slate-200 mb-4">
                                {selected ? "Edit employee" : "New employee"}
                            </h2>
                            <form onSubmit={handleUserSubmit} className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Username</label>
                                    <input type="text" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className={inputClass} required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">{selected ? "New password (optional)" : "Password"}</label>
                                    <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className={inputClass} required={!selected} />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Role</label>
                                    <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })} className={inputClass}>
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="master">Master</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Business</label>
                                    <select value={userForm.business_id} onChange={(e) => setUserForm({ ...userForm, business_id: parseInt(e.target.value) })} className={inputClass}>
                                        {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Security question</label>
                                    <input type="text" value={userForm.security_question} onChange={(e) => setUserForm({ ...userForm, security_question: e.target.value })} className={inputClass} required={!selected} />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Security answer</label>
                                    <input type="text" value={userForm.security_answer} onChange={(e) => setUserForm({ ...userForm, security_answer: e.target.value })} className={inputClass} required={!selected} />
                                </div>
                                {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
                                <div className="col-span-2 flex gap-3 justify-end">
                                    <button type="button" onClick={resetForms} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                        {selected ? "Save changes" : "Create employee"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[550px]">
                                <thead className="border-b border-slate-700">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Username</th>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Role</th>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Business</th>
                                        <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-slate-500">No employees registered</td>
                                        </tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">{user.username}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                                                        {roleLabel(user.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {businesses.find(b => b.id === user.business_id)?.name ?? "—"}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEditUser(user)} className="text-indigo-400 hover:text-indigo-300 font-medium mr-4 transition-colors">Edit</button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {tab === "businesses" && (
                <>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                            + New business
                        </button>
                    </div>

                    {showForm && (
                        <div className="bg-[#161b27] border border-slate-700 rounded-xl p-6 mb-6">
                            <h2 className="text-base font-medium text-slate-200 mb-4">
                                {selected ? "Edit business" : "New business"}
                            </h2>
                            <form onSubmit={handleBusinessSubmit} className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Name</label>
                                    <input type="text" value={businessForm.business_name} onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })} className={inputClass} required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">RIF</label>
                                    <input type="text" value={businessForm.business_RIF} onChange={(e) => setBusinessForm({ ...businessForm, business_RIF: e.target.value })} className={inputClass} required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Zip code</label>
                                    <input type="text" value={businessForm.business_CP} onChange={(e) => setBusinessForm({ ...businessForm, business_CP: e.target.value })} className={inputClass} required />
                                </div>
                                {error && <p className="col-span-3 text-red-400 text-sm">{error}</p>}
                                <div className="col-span-3 flex gap-3 justify-end">
                                    <button type="button" onClick={resetForms} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">Cancel</button>
                                    <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                        {selected ? "Save changes" : "Create business"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-[#161b27] border border-slate-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[550px]">
                                <thead className="border-b border-slate-700">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Name</th>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">RIF</th>
                                        <th className="text-left px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Zip code</th>
                                        <th className="text-right px-6 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {businesses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-slate-500">No businesses registered</td>
                                        </tr>
                                    ) : (
                                        businesses.map(business => (
                                            <tr key={business.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">{business.name}</td>
                                                <td className="px-6 py-4 text-slate-400">{business.RIF}</td>
                                                <td className="px-6 py-4 text-slate-400">{business.CP}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleEditBusiness(business)} className="text-indigo-400 hover:text-indigo-300 font-medium mr-4 transition-colors">Edit</button>
                                                    <button onClick={() => handleDeleteBusiness(business.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>

    )
}

export default Management