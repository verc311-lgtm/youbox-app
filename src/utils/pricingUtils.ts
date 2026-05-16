export interface Tarifa {
  id: string;
  nombre_servicio: string;
  tarifa_q: number;
  tipo_cobro: string;
}

export interface PaqueteSimplificado {
  id: string;
  peso_lbs: number;
  notas: string | null;
}

/**
 * Extrae el tipo de empaque de las notas del paquete.
 * Ejemplo: "[Empaque: Shein Bolsa]" -> "shein bolsa"
 */
export const getEmpaqueFromNotas = (notas: string | null): string | null => {
  if (!notas) return null;
  const m = notas.match(/\[Empaque:\s*([^\]]+)\]/);
  return m ? m[1].trim().toLowerCase() : null;
};

/**
 * Calcula el costo de un paquete individual basado en tarifas de la bodega.
 */
export const calculatePackageCost = (paq: PaqueteSimplificado, tarifas: Tarifa[]): { tarifa: Tarifa | null; costo: number } => {
  if (tarifas.length === 0) return { tarifa: null, costo: 0 };
  
  const empaque = getEmpaqueFromNotas(paq.notas);
  
  if (empaque && empaque !== 'libra') {
    // Intentar coincidir con el nombre del servicio (ej: "Shein Bolsa")
    const matched = tarifas.find(t =>
      t.nombre_servicio.toLowerCase().includes(empaque)
    );
    
    if (matched) {
      const costo = matched.tipo_cobro === 'por_libra'
        ? matched.tarifa_q * (Number(paq.peso_lbs) || 1)
        : matched.tarifa_q;
      return { tarifa: matched, costo };
    }
  }

  // Fallback: Flete General or first available libar-based tariff
  const libraT = tarifas.find(t => t.tipo_cobro === 'por_libra') || tarifas[0];
  const costo = libraT.tipo_cobro === 'por_libra'
    ? libraT.tarifa_q * (Number(paq.peso_lbs) > 0 ? Number(paq.peso_lbs) : 1)
    : libraT.tarifa_q;
    
  return { tarifa: libraT, costo };
};

/**
 * Calcula el total estimado para un conjunto de paquetes.
 */
export const calculateConsolidationEstimate = (paquetes: PaqueteSimplificado[], tarifas: Tarifa[]): number => {
  return paquetes.reduce((sum, paq) => {
    const { costo } = calculatePackageCost(paq, tarifas);
    return sum + costo;
  }, 0);
};
