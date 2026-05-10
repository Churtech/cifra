# Documentación de la API de FinCompare

Esta documentación detalla todos los endpoints disponibles en la API de FinCompare, incluyendo sus parámetros, estructuras de solicitud (request) y modelos de respuesta (response).

## Información General

- **Base URL:** `http://localhost:8080` (Desarrollo) o la URL del servidor de producción.
- **Prefijo de API:** `/api/v1` (para la mayoría de los endpoints de negocio).
- **Formato:** Todas las solicitudes y respuestas utilizan JSON.
- **Fechas:** Se utiliza el formato ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`).

---

## Manejo de Errores

La API utiliza códigos de estado HTTP estándar para indicar el éxito o fracaso de una solicitud.

| Código | Descripción |
|--------|-------------|
| `200`  | Éxito (OK) |
| `201`  | Recurso creado exitosamente |
| `400`  | Solicitud inválida o error de validación |
| `404`  | Recurso no encontrado |
| `500`  | Error interno del servidor |

### Estructura de Error Genérico
```json
{
  "error": "Mensaje del error",
  "error_id": "ERR-123456789" (opcional, para seguimiento en logs)
}
```

### Estructura de Error de Validación (400)
```json
{
  "error": "Validation error",
  "fields": {
    "nombre_del_campo": "Mensaje específico de validación"
  }
}
```

---

## 1. Salud y Administración

### 1.1 Health Check
Verifica si el servicio de API está corriendo.

- **URL:** `/health`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "status": "UP"
}
```

### 1.2 Readiness Check
Verifica si el servicio está listo para recibir tráfico (dependencias activas).

- **URL:** `/ready`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "status": "READY"
}
```

### 1.3 Ejecutar Jobs (Admin)
Ejecuta manualmente los jobs de actualización de datos.

- **URL:** `/admin/run-jobs`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "message": "Jobs started successfully"
}
```

---

## 2. CDTs (Certificados de Depósito a Término)

### 2.1 Listar CDTs con Cálculos
Obtiene una lista de CDTs proyectados con un monto y plazo específicos.

- **URL:** `/api/v1/cdts`
- **Método:** `GET`
- **Parámetros Query:**
  - `investment` (float, default: `5000000`): Monto a invertir en COP.
  - `days` (int, default: `180`): Plazo de la inversión en días.
- **Respuesta (200):**
```json
{
  "data": [
    {
      "cdt": {
        "id": 1,
        "institution_id": 1,
        "institution": {
          "id": 1,
          "name": "Banco de Bogotá",
          "logo_url": "https://...",
          "type": "banco"
        },
        "tasa_ea": 12.5,
        "plazo_dias": 180,
        "monto_min": 500000,
        "recorded_date": "2024-05-01T00:00:00Z"
      },
      "nominal_return": 6.25,
      "net_return": 5.31,
      "real_return": 2.1,
      "interest_gross": 312500,
      "withholding": 46875,
      "interest_net": 265625,
      "final_amount": 5265625,
      "net_rate_ea": 10.6,
      "risk": "Bajo",
      "liquidity": "Bloqueado hasta vencimiento",
      "guarantee": "Fogafin hasta $50M"
    }
  ],
  "meta": {
    "count": 1,
    "days": 180,
    "investment": 5000000
  }
}
```

### 2.2 Obtener Mejor CDT
Obtiene el CDT que ofrece el mejor retorno para los parámetros dados.

- **URL:** `/api/v1/cdts/best`
- **Método:** `GET`
- **Parámetros Query:** Mismos que `2.1`.
- **Respuesta (200):** Objeto único dentro de `data` con la misma estructura que un elemento de la lista en `2.1`.

---

## 3. Activos (ETFs y Acciones)

### 3.1 Listar Activos con Cálculos
Obtiene una lista de activos (ETFs por defecto) con métricas proyectadas.

- **URL:** `/api/v1/assets`
- **Método:** `GET`
- **Parámetros Query:**
  - `investment` (float, default: `5000000`): Monto base para cálculos.
  - `days` (int, default: `180`): Horizonte de tiempo.
  - `type` (string, default: `etf`): Tipo de activo (`etf` o `stock`).
- **Respuesta (200):**
```json
{
  "data": [
    {
      "asset": {
        "id": 1,
        "ticker": "CSPX.L",
        "name": "iShares Core S&P 500 UCITS ETF",
        "type": "etf",
        "currency": "USD"
      },
      "price_usd": 540.2,
      "price_cop": 2100000,
      "change_1d": 0.5,
      "change_7d": 1.2,
      "change_30d": -0.8,
      "change_1y": 15.4,
      "volatility": 12.5,
      "risk": "Medio",
      "annual_return": 10.2
    }
  ],
  "meta": {
    "count": 1,
    "days": 180,
    "investment": 5000000,
    "type": "etf"
  }
}
```

### 3.2 Obtener Detalle de Activo
- **URL:** `/api/v1/assets/:ticker`
- **Método:** `GET`
- **Respuesta (200):** Objeto único con métricas detalladas.

### 3.3 Obtener Histórico de Precios
- **URL:** `/api/v1/assets/:ticker/history`
- **Método:** `GET`
- **Parámetros Query:**
  - `days` (int, default: `730`): Número de días hacia atrás.
- **Respuesta (200):**
```json
{
  "data": [
    {
      "date": "2024-05-01T00:00:00Z",
      "close": 540.2,
      "change_pct": 0.1
    }
  ],
  "meta": { "ticker": "SPY", "days": 730, "count": 1 }
}
```

---

## 4. Portafolios (Simulador)

### 4.1 Crear Portafolio
Crea un nuevo portafolio con una asignación específica de activos.

- **URL:** `/api/v1/portfolios`
- **Método:** `POST`
- **Request Body:**
```json
{
  "name": "Mi Portafolio Balanceado",
  "description": "Opcional: Descripción del portafolio",
  "total_investment_cop": 10000000,
  "user_id": 1,
  "allocations": [
    {
      "ticker": "CSPX.L",
      "weight_percentage": 60.0
    },
    {
      "ticker": "IB01.L",
      "weight_percentage": 40.0
    }
  ]
}
```
*Nota: Se puede enviar `asset_id` en lugar de `ticker` en las allocations.*

- **Respuesta (201):**
```json
{
  "message": "Portfolio created successfully",
  "data": {
    "portfolio_id": 123
  }
}
```

### 4.2 Listar Portafolios
- **URL:** `/api/v1/portfolios`
- **Método:** `GET`
- **Parámetros Query:** `user_id`, `limit`, `offset`.
- **Respuesta (200):**
```json
{
  "portfolios": [
    {
      "id": 123,
      "name": "Mi Portafolio Balanceado",
      "total_investment_cop": 10000000,
      "expected_return": 8.5,
      "volatility": 10.2,
      "sharpe_ratio": 0.8,
      "diversification_score": 75,
      "created_at": "2024-05-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### 4.3 Obtener Detalle de Portafolio Completo
Incluye métricas, correlaciones, contribuciones y recomendaciones en un solo objeto.

- **URL:** `/api/v1/portfolios/:portfolio_id`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "id": 123,
  "name": "Mi Portafolio Balanceado",
  "description": "Opcional",
  "total_investment_cop": 10000000,
  "created_at": "2024-05-01T12:00:00Z",
  "updated_at": "2024-05-01T12:00:00Z",
  "allocations": [
    { "asset_id": 1, "weight_percentage": 60 }
  ],
  "metrics": {
    "expected_return": 8.5,
    "volatility": 10.2,
    "sharpe_ratio": 0.8,
    "diversification_score": 75,
    "calculated_at": "2024-05-01T12:00:00Z"
  },
  "correlations": {
    "assets": ["CSPX.L", "IB01.L"],
    "matrix": [[1.0, 0.1], [0.1, 1.0]]
  },
  "recommendation": {
    "classification": "balanced",
    "summary": "Su portafolio tiene una buena diversificación...",
    "risks": ["Exposición a divisas"],
    "actions": ["Considerar rebalanceo trimestral"]
  }
}
```

### 4.4 Actualizar Portafolio
- **URL:** `/api/v1/portfolios/:portfolio_id`
- **Método:** `PUT`
- **Request Body:** Mismo formato que el `POST` en `4.1`.
- **Respuesta (200):**
```json
{
  "message": "Portfolio updated successfully"
}
```

### 4.5 Eliminar Portafolio
- **URL:** `/api/v1/portfolios/:portfolio_id`
- **Método:** `DELETE`
- **Respuesta (200):**
```json
{
  "message": "Portfolio deleted successfully"
}
```

### 4.6 Obtener Métricas de Portafolio (Individual)
- **URL:** `/api/v1/portfolios/:portfolio_id/metrics`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "message": "Portfolio metrics retrieved successfully",
  "data": {
    "portfolio_id": 123,
    "expected_return": 8.5,
    "volatility": 10.2,
    "sharpe_ratio": 0.8,
    "diversification_score": 75,
    "calculated_at": "2024-05-01T12:00:00Z"
  }
}
```

### 4.7 Obtener Correlaciones de Portafolio (Individual)
- **URL:** `/api/v1/portfolios/:portfolio_id/correlations`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "message": "Portfolio correlations retrieved successfully",
  "data": {
    "portfolio_id": 123,
    "assets": ["CSPX.L", "IB01.L"],
    "matrix": [[1.0, 0.1], [0.1, 1.0]],
    "calculated_at": "2024-05-01T12:00:00Z"
  }
}
```

### 4.8 Obtener Recomendaciones de Portafolio (Individual)
- **URL:** `/api/v1/portfolios/:portfolio_id/recommendations`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "message": "Portfolio recommendations retrieved successfully",
  "data": {
    "portfolio_id": 123,
    "classification": "balanced",
    "summary": "...",
    "risks": ["..."],
    "actions": ["..."],
    "generated_at": "2024-05-01T12:00:00Z"
  }
}
```

### 4.9 Comparar Portafolios
Compara métricas entre 2 y 5 portafolios existentes.

- **URL:** `/api/v1/portfolios/compare`
- **Método:** `POST`
- **Request Body:**
```json
{
  "portfolio_ids": [123, 124]
}
```
- **Respuesta (200):**
```json
{
  "message": "Portfolios compared successfully",
  "data": {
    "portfolios": {
      "123": { "id": 123, "name": "P1", "metrics": { ... } },
      "124": { "id": 124, "name": "P2", "metrics": { ... } }
    },
    "best_return_portfolio_id": 124,
    "best_sharpe_portfolio_id": 123
  }
}
```

---

## 5. Backtesting

### 5.1 Ejecutar Backtest de Portafolio
Simula el rendimiento histórico de un portafolio en un periodo determinado.

- **URL:** `/api/v1/portfolios/:portfolio_id/backtest`
- **Método:** `POST`
- **Request Body:**
```json
{
  "start_date": "2023-01-01T00:00:00Z",
  "end_date": "2023-12-31T23:59:59Z"
}
```
- **Respuesta (200):**
```json
{
  "message": "Backtest completed successfully",
  "data": {
    "portfolio_id": 123,
    "start_date": "2023-01-01",
    "end_date": "2023-12-31",
    "initial_investment": 10000000,
    "final_value": 11200000,
    "total_return": 12.0,
    "annualized_return": 12.0,
    "volatility": 10.5,
    "sharpe_ratio": 1.1,
    "win_rate": 0.55,
    "daily_values": [
      {
        "date": "2023-01-01",
        "portfolio_value": 10000000,
        "cumulative_return": 0
      }
    ]
  }
}
```

---

## 6. Métricas de Mercado

### 6.1 Métricas Generales
Resumen de CDTs, mejores activos, TRM e Inflación.

- **URL:** `/api/v1/metrics`
- **Método:** `GET`
- **Respuesta (200):**
```json
{
  "data": {
    "cdt_average_180d": 11.5,
    "best_cdt_rate": 13.2,
    "trm_current": 3950.5,
    "inflation_rate": 7.2,
    "timestamp": "2024-05-01T12:00:00Z"
  }
}
```

### 6.2 Métricas de TRM
Obtiene la TRM actual con cambios porcentuales y máximos/mínimos históricos.

- **URL:** `/api/v1/trm/metrics`
- **Método:** `GET`
- **Parámetros Query:** `days` (default: `30`, no se usa actualmente pero se acepta).
- **Respuesta (200):**
```json
{
  "data": {
    "current": 3950.5,
    "change_7d": -1.2,
    "change_30d": 2.5,
    "high_52w": 4500,
    "low_52w": 3700,
    "average": 3920.0
  }
}
```

**Nota:** El IPC (Inflación) se retorna como `inflation_rate` en este endpoint.

### 6.3 Volatilidad de Activo
- **URL:** `/api/v1/volatility`
- **Método:** `GET`
- **Parámetros Query:** `ticker` (required), `days` (default: `730`).
- **Respuesta (200):**
```json
{
  "data": {
    "ticker": "SPY",
    "volatility": 12.5,
    "days": 730
  }
}
```

### 6.4 Correlación entre Activos
- **URL:** `/api/v1/correlations`
- **Método:** `GET`
- **Parámetros Query:** `ticker1` (req), `ticker2` (req), `days` (default: `730`).
- **Respuesta (200):**
```json
{
  "data": {
    "ticker1": "SPY",
    "ticker2": "QQQ",
    "correlation": 0.92,
    "days": 730
  }
}
```

---

## 7. IPC (Índice de Precios al Consumidor)

### 7.1 Obtener IPC Actual
El IPC (inflación de Colombia) se obtiene del **World Bank API** y se retorna como parte de las métricas generales.

- **Endpoint:** `GET /api/v1/metrics` → `data.inflation_rate`
- **Endpoint:** `GET /api/v1/trm/metrics` → `data.inflation_rate`

**Ejemplo de respuesta:**
```json
{
  "data": {
    "cdt_average_180d": 11.5,
    "best_cdt_rate": 13.2,
    "trm_current": 3950.5,
    "inflation_rate": 7.2,
    "timestamp": "2024-05-01T12:00:00Z"
  }
}
```

**Nota:** El IPC se actualiza automáticamente cuando se ejecutan los jobs de métricas (diariamente a las 9:00 AM). Es la tasa de inflación anual de Colombia según el Banco Mundial.
