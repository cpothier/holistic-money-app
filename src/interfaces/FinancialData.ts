export interface FinancialData {
    entry_id: string;
    ordering_id: string;
    txnDate: string;
    parent_account: string;
    sub_account: string | null;
    child_account: string | null;
    actual: number;
    budget_amount: number;
    comment_text?: string;
    comment_by?: string;
    comment_date?: string;
    comment_id?: string;
}

export interface FinancialComment {
    comment_id: string;
    entry_id: string;
    comment_text: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface FinancialDataResponse {
    data: FinancialData[];
    totalActual: number;
    totalBudget: number;
} 