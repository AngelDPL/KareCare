export interface AppointmentStats {
    total: number
    pending: number
    completed: number
}

export interface PaymentStats { 
    total_estimated: string
    total_collected: string
    total_pending: string
    total_payments: number
    pending: number
    paid: number
    collection_rate: number
}

export interface DashboardStats {
    appointments: AppointmentStats
    payments: PaymentStats
}