import { supabase } from '../lib/supabase';

export interface DashboardStats {
    visitasAtivas: number;
    visitasHoje: number;
    ocupacaoArmarios: number;
    totalArmarios: number;
    mediaDiaria: number;
}

export const dashboardService = {
    // Estatísticas completas para o dashboard
    async getStats(espacoId: string): Promise<{ data: DashboardStats | null; error: any }> {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Visitas ativas
            const { count: ativas, error: err1 } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('espaco_id', espacoId)
                .in('status', ['Ativo', 'Excedido']);

            if (err1) throw err1;

            // Visitas hoje
            const { count: hoje, error: err2 } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('espaco_id', espacoId)
                .gte('checkin', `${today}T00:00:00`)
                .lte('checkin', `${today}T23:59:59`);

            if (err2) throw err2;

            // Buscar configuração de armários do espaço
            const { data: espaco, error: err3 } = await supabase
                .from('espacos')
                .select('total_armarios')
                .eq('id', espacoId)
                .single();

            if (err3) throw err3;

            // Armários ocupados (visitas ativas com armário)
            const { count: ocupados, error: err4 } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('espaco_id', espacoId)
                .in('status', ['Ativo', 'Excedido'])
                .not('armario', 'is', null);

            if (err4) throw err4;

            // Média diária (últimos 7 dias)
            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

            const { count: totalSemana, error: err5 } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('espaco_id', espacoId)
                .gte('checkin', seteDiasAtras.toISOString());

            if (err5) throw err5;

            return {
                data: {
                    visitasAtivas: ativas || 0,
                    visitasHoje: hoje || 0,
                    ocupacaoArmarios: ocupados || 0,
                    totalArmarios: espaco?.total_armarios || 0,
                    mediaDiaria: Math.round((totalSemana || 0) / 7)
                },
                error: null
            };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Visitas por hora (gráfico)
    async getVisitasPorHora(espacoId: string, data: string) {
        const { data: visits, error } = await supabase
            .from('visits')
            .select('checkin')
            .eq('espaco_id', espacoId)
            .gte('checkin', `${data}T00:00:00`)
            .lte('checkin', `${data}T23:59:59`);

        if (error) return { data: null, error };

        // Agrupar por hora
        const porHora: Record<number, number> = {};
        visits?.forEach(v => {
            const hora = new Date(v.checkin).getHours();
            porHora[hora] = (porHora[hora] || 0) + 1;
        });

        return { data: porHora, error: null };
    }
};