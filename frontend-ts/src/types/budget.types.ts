export type BudgetStatus = "draft" | "sent" | "accepted" | "rejected"


export interface BudgetItem {
    id: number
    budget_id: number
    service_id: number
    service_name: string | null
    description: string
    quantity: number
    unit_price: string
    subtotal: string
    created_at: string
}


export interface Budget {
    id: number
    client_id: number
    client_name: string | null
    client_email: string | null
    business_id: number
    status: BudgetStatus 
    notes: string | null
    valid_until: string | null
    total: string
    items: BudgetItem[]
    created_at: string
    updated_at: string
}