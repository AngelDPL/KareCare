import { useState, useRef, useEffect } from "react"

interface SelectOption {
    value: string
    label: string
}

interface SelectProps {
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    className?: string
}

const Select = ({ value, onChange, options, placeholder = "Select...", className = "" }: SelectProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [search, setSearch] = useState<string>("")
    const ref = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selected = options.find(o => o.value === value)

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch("")
            }
        }
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50)
    }, [open])

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 flex items-center justify-between whitespace-nowrap"
            >
                <span className={selected ? "text-slate-200" : "text-slate-500"}>
                    {selected ? selected.label : placeholder}
                </span>
                <i className={`ti ti-chevron-down text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {open && (
                <div className="absolute z-50 w-full mt-1 bg-[#161b27] border border-slate-700 rounded-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-700">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full bg-[#0f1117] border border-slate-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {placeholder && !search && (
                            <div
                                onClick={() => { onChange(""); setOpen(false); setSearch("") }}
                                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-800 cursor-pointer"
                            >
                                {placeholder}
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">No results</div>
                        ) : (
                            filtered.map(o => (
                                <div
                                    key={o.value}
                                    onClick={() => { onChange(o.value); setOpen(false); setSearch("") }}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                                        o.value === value
                                            ? "bg-indigo-900/50 text-indigo-300"
                                            : "text-slate-200 hover:bg-slate-800"
                                    }`}
                                >
                                    {o.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Select