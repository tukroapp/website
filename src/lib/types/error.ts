export interface ApiValidationError {
    code: string;
    message: string | null;
    params: Record<string, unknown>;
}

export type ApiErrorNode = ApiValidationError[] | { [key: string]: ApiErrorNode };

export interface ApiErrorBody {
    error: Record<string, ApiErrorNode>;
}
