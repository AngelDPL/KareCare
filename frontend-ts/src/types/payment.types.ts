type PaymentMethods = "cash" | "card"
type PaymentStatus = "pending" | "paid"



export interface PaymentHistory {
    id: number
    payment_id: number
    amount: string
    payment_method: PaymentMethods
    payment_date: string | null
    created_at: string
}


export interface Payment {
    id: number
    client_id: number
    payment_method: PaymentMethods
    estimated_total: string
    payments_made: string
    pending_payments: string
    payment_date: string | null
    status: PaymentStatus
    history: PaymentHistory[]
    created_at: string
    updated_at: string
}