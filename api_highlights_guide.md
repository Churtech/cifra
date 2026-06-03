# Guía de Integración: Endpoint de Activos Destacados (Highlights)

Esta guía detalla cómo integrar el nuevo sistema de activos destacados en el Dashboard de FinCompare. El endpoint proporciona una selección inteligente de los 9 activos con mejor desempeño (Top 3 por categoría) utilizando ventanas de tiempo dinámicas.

## 📍 Especificación del Endpoint

- **URL:** `/api/v1/assets/highlights`
- **Método:** `GET`
- **Autenticación:** No requerida (Público)

### Parámetros de Consulta (Query Params)

| Parámetro | Tipo | Requerido | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | No | `etf` | Tipo de activo a destacar: `etf` o `stock`. |
| `days` | int | No | `365` | Horizonte de datos históricos para los cálculos base. |

---

## 🏗️ Estructura de la Respuesta (JSON)

La respuesta agrupa los activos en tres categorías lógicas basadas en perfiles de inversión. Cada categoría contiene un array con el **Top 3** de activos que mejor cumplen ese criterio.

```json
{
  "growth": [ ... ],     // Top 3: Líderes de Crecimiento (Ventana: 30 días)
  "efficiency": [ ... ], // Top 3: Rendimiento Inteligente (Ventana: 90 días)
  "stability": [ ... ]   // Top 3: Inversión Estable (Ventana: 180 días)
}
```

### Detalle de cada objeto `Highlight`:

Cada elemento dentro de las listas tiene la siguiente estructura:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `type` | string | Identificador de categoría: `GROWTH`, `EFFICIENCY`, `STABILITY`. |
| `label` | string | Título profesional para mostrar en el UI. |
| `metric_name` | string | Nombre de la métrica principal calculada. |
| `metric_value` | string | Valor de la métrica formateado para visualización (ej: "72.0%"). |
| `analysis` | string | Explicación empática del por qué este activo está destacado. |
| `asset` | object | Objeto completo con los datos del activo (Ticker, Precios, etc.). |

---

## 📊 Categorías y Lógica de Negocio

Para asegurar que el Dashboard se sienta "vivo" y profesional, cada categoría utiliza una ventana de tiempo diferente:

### 1. 🚀 Líder de Crecimiento (Growth)
- **Ventana:** Últimos **30 días**.
- **Métrica:** Cambio porcentual de precio (`change_30d`).
- **Uso:** Ideal para resaltar activos con alto "Momentum". Resaltar el porcentaje de crecimiento mensual.

### 2. ⚖️ Rendimiento Inteligente (Efficiency)
- **Ventana:** Últimos **90 días**.
- **Métrica:** Ratio de Sharpe trimestral (`sharpe_90d`).
- **Uso:** Destaca activos con la mejor relación Riesgo-Retorno. Es el indicador para perfiles profesionales.

### 3. 🛡️ Inversión Estable (Stability)
- **Ventana:** Últimos **180 días**.
- **Métrica:** Volatilidad semestral (`volatility_180d`).
- **Uso:** Muestra los activos con mayor resiliencia. Ideal para perfiles conservadores.

---

## 🛠️ Ejemplo de Implementación (Frontend)

```javascript
// Ejemplo de llamada desde el Front
const fetchHighlights = async (assetType = 'etf') => {
  try {
    const response = await fetch(`http://api.fincompare.com/api/v1/assets/highlights?type=${assetType}`);
    const data = await response.json();
    
    // Acceder a los Top 3
    console.log("Los más calientes del mes:", data.growth);
    console.log("Los más eficientes del trimestre:", data.efficiency);
    console.log("Los más seguros del semestre:", data.stability);
    
  } catch (error) {
    console.error("Error cargando destacados:", error);
  }
};
```

### Recomendaciones de UI:
- **Análisis dinámico:** Utiliza el campo `analysis` en un tooltip o debajo del nombre del activo para dar confianza al usuario.
- **Diferenciación:** Usa colores o iconos distintos para cada categoría (Fuego 🚀 para Growth, Balanza ⚖️ para Efficiency, Escudo 🛡️ para Stability).
- **Actualización:** Informa al usuario que estos datos se recalculan diariamente al cierre del mercado.
