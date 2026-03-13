import fs from 'fs';

const filePath = 'src/components/ConsolidationsList.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `    const filtered = consolidaciones.filter(c =>
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
            {/* List Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass p-4 rounded-2xl w-full">
                <div className="relative w-full sm:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por código de Consolidado o Estatus..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
                    />
                </div>
                <button
                    onClick={fetchConsolidaciones}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-200 w-full sm:w-auto"
                >
                    Refrescar Lista
                </button>
            </div>`;


const replacementStr = `    const filtered = consolidaciones.filter(c =>
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFacturado = filtered.reduce((sum, c) => sum + (c.monto_facturado || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
            {/* List Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass p-4 rounded-2xl w-full">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por código de Consolidado o Estatus..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
                        />
                    </div>
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/60 font-bold whitespace-nowrap shadow-sm md:w-auto w-full">
                        <Layers className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700/80 font-medium text-sm">Total Facturado Lote:</span>
                        <span className="text-emerald-700 text-lg">Q{totalFacturado.toFixed(2)}</span>
                    </div>
                </div>
                <button
                    onClick={fetchConsolidaciones}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-200 w-full sm:w-auto"
                >
                    Refrescar Lista
                </button>
            </div>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated ConsolidationsList.tsx');
} else {
    console.log('Target string NOT FOUND in file. Could not perform replace.');
}
