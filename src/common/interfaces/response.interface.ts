export interface IResponse<T> {
    data: T | null;
    arr_messages: {
        type: 'S' | 'E' | 'I';
        text: string;
    }[];
}