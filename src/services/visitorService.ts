import { supabase } from '../lib/supabase';

export interface Visitor {
    id?: string;
    full_name: string;
    cpf?: string;
    passport?: string;
    is_foreigner: boolean;
    gender?: string;
    category?: string;
    phone?: string;
    email?: string;
    address?: string;
    created_at?: string;
}

export const visitorService = {
    async findByDocument(document: string, isForeigner: boolean) {
        const column = isForeigner ? 'passport' : 'cpf';
        const { data, error } = await supabase
            .from('visitors')
            .select('*')
            .eq(column, document)
            .maybeSingle();
        return { data, error };
    },

    async listAll() {
        const { data, error } = await supabase
            .from('visitors').select('*').order('full_name', { ascending: true }).limit(500);
        return { data: data as Visitor[], error };
    },

    async create(visitor: Omit<Visitor, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('visitors')
            .insert(visitor)
            .select()
            .single();
        return { data: data as Visitor, error };
    },

    async update(id: string, updates: Partial<Visitor>) {
        const { data, error } = await supabase
            .from('visitors')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data: data as Visitor, error };
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('visitors')
            .delete()
            .eq('id', id);
        return { error };
    }
};