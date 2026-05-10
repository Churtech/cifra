# FinCompare — Guía de Arquitectura Técnica

> Comparador de Productos Financieros: CDTs • ETFs • Acciones  
> Versión 1.0 — Mayo 2026

---

## Tabla de Contenido

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Fuentes de Datos y Estrategia de Scraping](#2-fuentes-de-datos-y-estrategia-de-scraping)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Modelo de Base de Datos](#4-modelo-de-base-de-datos)
5. [Arquitectura del Sistema](#5-arquitectura-del-sistema)
6. [Endpoints de la API REST](#6-endpoints-de-la-api-rest)
7. [Infraestructura y Deploy](#7-infraestructura-y-deploy)
8. [Roadmap de Desarrollo](#8-roadmap-de-desarrollo)
9. [Checklist de Inicio Rápido](#9-checklist-de-inicio-rápido)

---

## 1. Visión General del Proyecto

FinCompare es una plataforma web que centraliza y compara productos financieros disponibles en Colombia: Certificados de Depósito a Término (CDTs), fondos ETF negociados en mercados internacionales y acciones colombianas y estadounidenses. El objetivo es responder en segundos preguntas como: **¿Dónde conviene poner $5 millones por 6 meses?**

### Propuesta de valor diferenciadora

- Comparación justa entre productos con distinto perfil de riesgo (CDT vs ETF vs acción)
- Cálculos de rendimiento neto: después de retención en la fuente e inflación
- Datos actualizados automáticamente sin intervención manual
- Interfaz simple orientada al inversionista colombiano no especializado

### 1.1 Alcance del MVP

| Producto | Fuente principal | Frecuencia de actualización | Esfuerzo |
|---|---|---|---|
| CDTs | datos.gov.co (Socrata API) + Banrep | Diario / Semanal | Medio |
| ETFs americanos | Financial Modeling Prep (FMP) | Diario (cierre mercado) | Bajo |
| Acciones colombianas | Scraping BVC / Investing.com | Diario (cierre mercado) | Medio |
| Acciones americanas | Alpha Vantage / FMP | Diario (cierre mercado) | Bajo |
| TRM (USD/COP) | Banrep API pública | Diario | Bajo |

---

## 2. Fuentes de Datos y Estrategia de Scraping

Esta sección detalla cada fuente de datos, su método de acceso, la estructura del dato resultante y las limitaciones conocidas. La estrategia general es **preferir APIs oficiales y semi-oficiales sobre scraping HTML** cuando existen, ya que son más estables ante cambios de diseño web.

### 2.1 CDTs — Tasas de Captación

Los CDTs no cotizan en bolsa. Cada entidad financiera fija su propia tasa de captación y la reporta a la Superintendencia Financiera de Colombia (SFC). Existen tres fuentes complementarias para obtener estos datos.

#### Fuente A: datos.gov.co — API Socrata (Principal)

El portal de datos abiertos del gobierno colombiano expone el conjunto de datos de tasas de captación publicado por la SFC a través de la API estándar de Socrata (SODA). Este es el método más robusto y confiable para CDTs.

| Atributo | Valor |
|---|---|
| Dataset ID | `axk9-g2nh` |
| Endpoint base | `https://www.datos.gov.co/resource/axk9-g2nh.json` |
| Autenticación | App token opcional (gratis en datos.gov.co) |
| Formato | JSON / CSV |
| Actualización fuente | Diaria (datos del día anterior) |
| Costo | Gratuito |

Ejemplo de llamada GET con filtro de fecha:

```
// GET https://www.datos.gov.co/resource/axk9-g2nh.json
//     ?$where=fecha >= '2026-05-01'
//     &$limit=500
//     &$$app_token=TU_TOKEN

// Campos relevantes del response:
// - fecha          string   Fecha de reporte
// - entidad        string   Nombre del banco o entidad
// - nit            string   NIT de la entidad
// - plazo          string   Plazo en días ("90", "180", "360"...)
// - tasa_efectiva  string   Tasa Efectiva Anual (EA) en porcentaje
// - monto_captado  string   Volumen captado en el período
```

#### Fuente B: Banco de la República (Complementaria)

El Banrep publica series históricas de tasas CDT por plazo (90, 180, 360 días) en formato CSV descargable. Incluye la **DTF** (tasa de referencia a 90 días) que es un indicador clave del mercado. Se accede mediante URL directa con parámetros de fecha.

| Atributo | Valor |
|---|---|
| Tipo de acceso | Descarga CSV por URL paramétrica |
| Actualización | Semanal (datos históricos y recientes) |
| Dato principal | DTF, tasas promedio por plazo |
| Costo | Gratuito, sin autenticación |

#### Fuente C: Superfinanciera — Portal de Estadísticas Dinámicas (Respaldo)

La SFC lanzó en 2024 su portal de Estadísticas Dinámicas basado en Power BI. Publica tasas de CDT por entidad y plazo con actualización periódica, respaldado por el Formato 441 que las entidades transmiten obligatoriamente. Se usa como validación o respaldo cuando datos.gov.co falle.

> **Nota:** La estrategia óptima para el MVP es usar `datos.gov.co` (Socrata) como fuente principal por su estabilidad y formato JSON nativo. El Banrep se usa como complemento para la DTF y series históricas. **No es necesario scrapear banco por banco para el MVP.**

---

### 2.2 ETFs — Fondos Cotizados en Bolsa

Para el MVP se priorizan ETFs americanos (NYSE Arca, NASDAQ) por su mayor volumen, liquidez y disponibilidad de datos. Los ETFs colombianos tienen mercado muy reducido y se consideran una fase posterior.

#### Fuente Principal: Financial Modeling Prep (FMP)

FMP ofrece datos de ETFs incluyendo precio, variación diaria, volumen, activos bajo administración (AUM), ratio de gastos (expense ratio) y descripción. El tier gratuito permite **250 solicitudes por día**, suficiente para cubrir entre 50 y 80 ETFs con actualización diaria.

| Endpoint | Descripción | Costo |
|---|---|---|
| `/v3/etf/list` | Listado completo de ETFs disponibles | Gratis |
| `/v3/quote/{symbol}` | Precio actual y variación del día | Gratis |
| `/v3/etf-holder/{symbol}` | Composición del ETF (top holdings) | Gratis |
| `/v3/historical-price-full/{symbol}` | Histórico de precios OHLCV | Gratis |
| `/v3/etf-info/{symbol}` | AUM, expense ratio, descripción | Gratis |

#### Fuente Secundaria: Alpha Vantage

Alpha Vantage es proveedor oficial de NASDAQ con datos sólidos de mercado. El tier gratuito es más limitado (25 solicitudes por día) pero suficiente para datos de respaldo o indicadores técnicos complementarios. Existen wrappers Go en GitHub para facilitar la integración.

#### ETFs recomendados para el MVP

| Ticker | Nombre | Categoría |
|---|---|---|
| SPY | SPDR S&P 500 ETF Trust | Renta variable USA |
| QQQ | Invesco QQQ Trust (Nasdaq 100) | Tecnología USA |
| VTI | Vanguard Total Stock Market ETF | Mercado total USA |
| EEM | iShares MSCI Emerging Markets ETF | Mercados emergentes |
| GLD | SPDR Gold Shares | Oro / Commodities |
| TLT | iShares 20+ Year Treasury Bond ETF | Renta fija largo plazo |
| ARKK | ARK Innovation ETF | Innovación / Alto riesgo |
| VWO | Vanguard FTSE Emerging Markets ETF | Mercados emergentes |

---

### 2.3 Acciones — Mercado Colombiano y Americano

#### Acciones Colombianas: Scraping de BVC / Investing.com

La BVC publica precios con ~15 minutos de delay en su portal público. Para el MVP se recomienda hacer scraping de **Investing.com** para acciones colombianas, ya que su estructura HTML es más estable. Se cubre el índice COLCAP (las 20 acciones más líquidas).

| Ticker BVC | Empresa | Sector |
|---|---|---|
| ECO | Ecopetrol S.A. | Energía / Petróleo |
| PFBCOLOM | Bancolombia (preferencial) | Banca |
| ISA | Interconexion Eléctrica S.A. | Energía eléctrica |
| NUTRESA | Grupo Nutresa | Consumo masivo |
| GRUPOSURA | Grupo de Inversiones Suramericana | Holding financiero |
| CEMARGOS | Cementos Argos | Construcción |
| ETB | Empresa de Telecomunicaciones de Bogotá | Telecomunicaciones |
| CNEC | Canacol Energy | Gas natural |

#### Acciones Americanas: FMP / Alpha Vantage

Para acciones del mercado americano (NYSE, NASDAQ) se usan las mismas APIs de FMP y Alpha Vantage que se utilizan para ETFs. No se requiere scraping adicional.

---

### 2.4 TRM — Tasa Representativa del Mercado

El Banco de la República publica la TRM (USD/COP) diariamente. Es crítica para convertir precios de ETFs y acciones americanas a pesos colombianos y hacer comparaciones homogéneas.

```
// Opción 1: Banrep (scraping simple)
// GET https://www.banrep.gov.co/es/trm

// Opción 2: ExchangeRate-API (más estable)
// GET https://v6.exchangerate-api.com/v6/{API_KEY}/pair/USD/COP
// Tier gratuito: 1,500 solicitudes/mes
```

---

## 3. Stack Tecnológico

Todo el backend se desarrolla en **Go**. La elección se justifica en que es el stack del equipo, Go produce binarios únicos sin dependencias externas (ideal para Render/Railway), tiene excelente rendimiento para jobs concurrentes de scraping, y su sistema de tipos ayuda a modelar datos financieros con precisión.

### 3.1 Resumen del Stack Completo

| Capa | Tecnología | Propósito | Por qué |
|---|---|---|---|
| API REST | Go + Gin | Exponer datos al frontend | Rápido, idiomático en Go |
| Worker / Scheduler | Go + gocron | Jobs automáticos de datos | Binario separado, liviano |
| Scraping HTML estático | Go + colly | Páginas sin JavaScript | Nativo Go, muy rápido |
| Scraping JS | Go + rod | Páginas con JavaScript (BVC) | Controla Chromium desde Go |
| Base de datos | PostgreSQL | Almacenamiento principal | Relacional, robusto, gratis en Render |
| Driver DB | pgx/v5 | Conexión Go-PostgreSQL | Estándar de facto en Go |
| Migraciones | golang-migrate | Versionado del schema | Simple, integrado al build |
| Variables de entorno | godotenv | Configuración por entorno | Práctica estándar |
| Frontend | React + Vite | Interfaz de usuario | Ecosistema amplio, deploy en Vercel |
| Deploy backend | Render.com | Hosting gratuito | $0 para MVP |
| Deploy frontend | Vercel | Hosting estático gratuito | $0 para MVP |

---

### 3.2 Librerías Go — Detalle de Uso

#### `github.com/gin-gonic/gin` — Framework HTTP

Gin es el framework HTTP más usado en el ecosistema Go. Se usa para definir los endpoints REST que el frontend consumirá. Ofrece routing rápido, middleware de CORS, autenticación JWT y manejo de errores.

```go
r := gin.Default()
r.Use(cors.Default())

// GET /api/v1/cdts?plazo=180&monto=5000000
r.GET("/api/v1/cdts", handlers.GetCDTs)

// GET /api/v1/assets?type=etf
r.GET("/api/v1/assets", handlers.GetAssets)

// GET /api/v1/compare?amount=5000000&days=180
r.GET("/api/v1/compare", handlers.GetComparison)

r.Run(":8080")
```

#### `github.com/go-co-op/gocron/v2` — Scheduler de Jobs

gocron permite definir jobs que se ejecutan automáticamente en horarios configurados. Es el corazón de la automatización: sin este componente los datos no se actualizarían. Se ejecuta en un proceso Go separado (`cmd/worker`).

```go
s, _ := gocron.NewScheduler()

// CDTs: cada noche a las 2:00 AM
s.NewJob(
    gocron.CronJob("0 2 * * *", false),
    gocron.NewTask(jobs.FetchCDTs),
)

// ETFs y acciones USA: lunes-viernes a las 7:00 PM (cierre NYSE)
s.NewJob(
    gocron.CronJob("0 19 * * 1-5", false),
    gocron.NewTask(jobs.FetchUSAssets),
)

// Acciones colombianas: lunes-viernes a las 5:00 PM (cierre BVC)
s.NewJob(
    gocron.CronJob("0 17 * * 1-5", false),
    gocron.NewTask(jobs.FetchColombianStocks),
)

// TRM: todos los días a las 9:00 AM
s.NewJob(
    gocron.CronJob("0 9 * * *", false),
    gocron.NewTask(jobs.FetchTRM),
)

s.Start()
defer s.Shutdown()
```

#### `github.com/gocolly/colly/v2` — Scraping HTML

colly es el scraper HTML más popular del ecosistema Go. Funciona para páginas que renderizan HTML estático en el servidor. Se usa para consumir endpoints JSON de `datos.gov.co` y Banrep.

```go
func FetchCDTsSocrata() ([]CDT, error) {
    c := colly.NewCollector()
    var results []CDT

    c.OnResponse(func(r *colly.Response) {
        json.Unmarshal(r.Body, &results)
    })

    url := "https://www.datos.gov.co/resource/axk9-g2nh.json" +
        "?$where=fecha >= '2026-01-01'" +
        "&$limit=500" +
        "&$$app_token=" + os.Getenv("SOCRATA_TOKEN")

    c.Visit(url)
    return results, nil
}
```

#### `github.com/go-rod/rod` — Scraping con JavaScript (Chromium)

rod es equivalente a Playwright pero en Go. Controla un navegador Chromium headless, permitiendo scrapear páginas que requieren JavaScript para renderizar su contenido. Se usa para el portal de la BVC.

```go
func ScrapeBVCStocks() ([]StockPrice, error) {
    browser := rod.New().MustConnect()
    defer browser.MustClose()

    page := browser.MustPage("https://www.bvc.com.co/mercados/renta-variable/acciones")
    page.MustWaitLoad()
    page.MustWaitVisible(".tabla-acciones")

    rows := page.MustElements(".fila-accion")
    var stocks []StockPrice

    for _, row := range rows {
        ticker := row.MustElement(".ticker").MustText()
        price  := row.MustElement(".precio").MustText()
        stocks = append(stocks, StockPrice{Ticker: ticker, Price: parsePrice(price)})
    }
    return stocks, nil
}
```

#### `github.com/jackc/pgx/v5` — Driver PostgreSQL

pgx es el driver PostgreSQL de referencia en Go. Soporta transacciones, connection pooling, tipos nativos de PostgreSQL y queries preparados.

```go
func UpsertCDT(ctx context.Context, pool *pgxpool.Pool, cdt CDT) error {
    _, err := pool.Exec(ctx, `
        INSERT INTO cdts (institution_id, tasa_ea, plazo_dias, monto_min, recorded_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (institution_id, plazo_dias, recorded_date)
        DO UPDATE SET tasa_ea = EXCLUDED.tasa_ea
    `, cdt.InstitutionID, cdt.TasaEA, cdt.PlazoDias, cdt.MontoMin, cdt.Date)
    return err
}
```

---

## 4. Modelo de Base de Datos

Se usa PostgreSQL como única base de datos. El schema está diseñado para ser simple en el MVP pero extensible hacia usuarios, portafolios y alertas en fases posteriores.

### 4.1 Tablas Principales

#### `institutions` — Entidades financieras

```sql
CREATE TABLE institutions (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    nit         VARCHAR(20),
    logo_url    TEXT,
    website     TEXT,
    type        VARCHAR(40) NOT NULL, -- 'banco', 'cooperativa', 'cf'
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `cdts` — Tasas de CDT por entidad y plazo

```sql
CREATE TABLE cdts (
    id              SERIAL PRIMARY KEY,
    institution_id  INT REFERENCES institutions(id),
    tasa_ea         NUMERIC(8,4) NOT NULL,   -- Tasa Efectiva Anual
    plazo_dias      INT NOT NULL,             -- 30, 60, 90, 180, 360...
    monto_min       BIGINT,                   -- En pesos COP
    monto_max       BIGINT,
    recorded_date   DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, plazo_dias, recorded_date)
);

CREATE INDEX idx_cdts_date  ON cdts(recorded_date DESC);
CREATE INDEX idx_cdts_plazo ON cdts(plazo_dias);
```

#### `assets` — ETFs y Acciones

```sql
CREATE TABLE assets (
    id            SERIAL PRIMARY KEY,
    ticker        VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(200) NOT NULL,
    type          VARCHAR(20)  NOT NULL,  -- 'etf', 'stock'
    exchange      VARCHAR(20),            -- 'NYSE', 'NASDAQ', 'BVC'
    currency      CHAR(3)      NOT NULL,  -- 'USD', 'COP'
    description   TEXT,
    expense_ratio NUMERIC(6,4),           -- Solo para ETFs
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `asset_prices` — Precios históricos

```sql
CREATE TABLE asset_prices (
    id          SERIAL PRIMARY KEY,
    asset_id    INT REFERENCES assets(id),
    price       NUMERIC(18,4) NOT NULL,
    price_cop   NUMERIC(18,2),          -- Convertido a COP con TRM del día
    change_pct  NUMERIC(8,4),           -- Variación porcentual del día
    volume      BIGINT,
    recorded_at DATE NOT NULL,
    UNIQUE(asset_id, recorded_at)
);

CREATE INDEX idx_prices_asset ON asset_prices(asset_id, recorded_at DESC);
```

#### `trm_history` — TRM diaria

```sql
CREATE TABLE trm_history (
    id          SERIAL PRIMARY KEY,
    rate        NUMERIC(12,2) NOT NULL,  -- COP por 1 USD
    date        DATE NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Arquitectura del Sistema

### 5.1 Componentes Principales

El sistema se divide en dos procesos Go independientes que comparten la misma base de datos PostgreSQL:

| Proceso | Comando | Responsabilidad | Uptime |
|---|---|---|---|
| API Server | `cmd/api/main.go` | Exponer REST API al frontend | 24/7 |
| Worker | `cmd/worker/main.go` | Jobs de scraping y fetch | 24/7 (jobs por cron) |

### 5.2 Estructura de Directorios

```
fincompare/
├── cmd/
│   ├── api/
│   │   └── main.go          ← Servidor HTTP (Gin)
│   └── worker/
│       └── main.go          ← Scheduler (gocron) + jobs
├── internal/
│   ├── domain/              ← Structs / entidades de negocio
│   │   ├── cdt.go
│   │   └── asset.go
│   ├── repository/          ← Acceso a datos (pgx)
│   │   ├── cdt.go
│   │   └── asset.go
│   ├── handler/             ← Handlers HTTP (Gin)
│   │   ├── cdt.go
│   │   └── asset.go
│   ├── scraper/             ← Scrapers por fuente
│   │   ├── socrata.go       ← CDTs via datos.gov.co
│   │   ├── banrep.go        ← DTF y TRM
│   │   └── bvc.go           ← Acciones colombianas (rod)
│   ├── fetcher/             ← Clientes de APIs externas
│   │   ├── fmp.go           ← Financial Modeling Prep
│   │   └── alphavantage.go  ← Alpha Vantage
│   └── scheduler/
│       └── jobs.go          ← Definición de todos los cron jobs
├── migrations/              ← Archivos SQL de migración
├── frontend/                ← Proyecto React/Vite
├── docker-compose.yml
├── .env.example
└── Makefile
```

### 5.3 Flujo de Datos — Pipeline Automático

```
FUENTES EXTERNAS                WORKER GO                    BASE DE DATOS
================                =========                    =============

datos.gov.co/CDTs  -------->  scraper/socrata.go   ------>  tabla: cdts
banrep.gov.co/TRM  -------->  scraper/banrep.go    ------>  tabla: trm_history
BVC (Chromium)     -------->  scraper/bvc.go        ------>  tabla: asset_prices
FMP API (ETFs)     -------->  fetcher/fmp.go        ------>  tabla: asset_prices
Alpha Vantage      -------->  fetcher/alphavantage  ------>  tabla: asset_prices

                                     |
                                     v
                             scheduler/jobs.go
                             (gocron cron jobs)

FRONTEND (React)                API SERVER GO
================                =============
/comparar  <----------  GET /api/v1/compare?amount=5M&days=180
/cdts      <----------  GET /api/v1/cdts?plazo=180
/etfs      <----------  GET /api/v1/assets?type=etf
/acciones  <----------  GET /api/v1/assets?type=stock
```

---

## 6. Endpoints de la API REST

La API expone los datos procesados al frontend. Todos los endpoints devuelven JSON y soportan parámetros de filtro.

### 6.1 Endpoints Principales

| Método | Endpoint | Descripción | Parámetros clave |
|---|---|---|---|
| GET | `/api/v1/cdts` | Lista CDTs con filtros | `plazo`, `monto`, `entidad` |
| GET | `/api/v1/assets` | Lista ETFs o acciones | `type`, `exchange`, `currency` |
| GET | `/api/v1/assets/:ticker` | Detalle de un activo | — |
| GET | `/api/v1/assets/:ticker/history` | Precios históricos | `from`, `to`, `period` |
| GET | `/api/v1/compare` | Comparación centralizada | `amount`, `days`, `risk` |
| GET | `/api/v1/trm` | TRM actual e histórico | `date`, `from`, `to` |
| GET | `/api/v1/institutions` | Lista de bancos/entidades | — |
| GET | `/health` | Estado del servicio | — |

### 6.2 Endpoint Estrella: `/api/v1/compare`

Este endpoint es el corazón del producto. Recibe el monto y el plazo del usuario y devuelve todos los productos comparables ordenados por rendimiento neto real.

```
GET /api/v1/compare?amount=5000000&days=180&risk=low
```

```json
{
  "amount": 5000000,
  "days": 180,
  "trm": 4250.50,
  "results": [
    {
      "rank": 1,
      "type": "cdt",
      "institution": "Davivienda",
      "product": "CDT 180 días",
      "tasa_ea": 13.1,
      "tasa_neta_ea": 11.14,
      "rendimiento_cop": 278500,
      "riesgo": "Bajo",
      "liquidez": "Bloqueado hasta vencimiento",
      "garantia": "Fogafin hasta $50M"
    },
    {
      "rank": 2,
      "type": "etf",
      "ticker": "TLT",
      "product": "iShares 20Y+ Treasury Bond",
      "retorno_anual_promedio": 4.2,
      "retorno_esperado_periodo": 2.1,
      "precio_actual_usd": 95.40,
      "precio_actual_cop": 405450,
      "riesgo": "Bajo-Medio",
      "liquidez": "Alta (mercado abierto)"
    }
  ]
}
```

---

## 7. Infraestructura y Deploy

### 7.1 Entorno Local — Docker Compose

Para desarrollo local se usa Docker Compose con PostgreSQL. Esto garantiza que el entorno local sea idéntico al de producción.

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fincompare
      POSTGRES_USER: fincompare
      POSTGRES_PASSWORD: secret123
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    command: ./cmd/api/api
    ports:
      - '8080:8080'
    depends_on: [postgres]
    env_file: .env

  worker:
    build: .
    command: ./cmd/worker/worker
    depends_on: [postgres]
    env_file: .env

volumes:
  pgdata:
```

### 7.2 Producción — Render.com (Gratuito para MVP)

Render.com ofrece un tier gratuito que cubre perfectamente el MVP.

| Servicio Render | Tipo | Costo | Configuración |
|---|---|---|---|
| fincompare-api | Web Service | $0/mes | Go build, `cmd/api/main.go` |
| fincompare-worker | Background Worker | $0/mes | Go build, `cmd/worker/main.go` |
| fincompare-db | PostgreSQL | $0/mes (1GB) | PostgreSQL 16 |
| Vercel (frontend) | Static Site | $0/mes | React + Vite, `npm run build` |

> **⚠️ Limitación:** Los Web Services gratuitos en Render se duermen después de 15 minutos de inactividad. Solución: configurar un ping cada 10 minutos con UptimeRobot (gratis). El Background Worker no tiene este problema.

### 7.3 Variables de Entorno

```env
# .env.example

# Base de datos
DATABASE_URL=postgres://fincompare:secret@localhost:5432/fincompare

# APIs externas
FMP_API_KEY=tu_key_financial_modeling_prep
ALPHA_VANTAGE_KEY=tu_key_alpha_vantage
SOCRATA_TOKEN=tu_token_datos_gov_co
EXCHANGERATE_KEY=tu_key_exchangerate_api

# App
PORT=8080
ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## 8. Roadmap de Desarrollo

| Fase | Semana | Entregable | Prioridad |
|---|---|---|---|
| Fase 1: Datos | 1 | Schema DB + migraciones + fetcher FMP (ETFs) | Crítica |
| Fase 1: Datos | 2 | Scraper Socrata CDTs + job scheduler base | Crítica |
| Fase 1: Datos | 3 | Scraper BVC acciones + TRM Banrep | Alta |
| Fase 2: API | 4 | Endpoints REST básicos + CORS + health check | Crítica |
| Fase 2: API | 5 | Endpoint `/compare` con lógica de rendimiento neto | Alta |
| Fase 3: Deploy | 6 | Docker Compose local + deploy Render + Vercel | Alta |
| Fase 4: Frontend | 7-8 | UI React: comparador, tablas, filtros | Media |
| Fase 5: Extras | 9+ | Alertas, portafolios, usuarios, monetización | Futura |

### 8.1 Orden de Implementación Recomendado

El orden sugerido maximiza el valor visible desde el día 1 y minimiza el riesgo técnico:

1. Crear el schema de PostgreSQL y las migraciones con `golang-migrate`
2. Implementar el fetcher de FMP para ETFs (API simple, fácil de validar)
3. Conectar el fetcher a la DB con pgx y verificar que los datos llegan correctamente
4. Agregar el scraper de Socrata para CDTs y validar contra la web de la SFC
5. Configurar gocron con los 4 jobs principales y probar en local
6. Exponer la API REST con Gin y probar con curl o Postman
7. Deploy en Render con las variables de entorno configuradas
8. Construir el frontend React con los endpoints de la API

### 8.2 Lógica de Negocio Crítica: Cálculo de Rendimiento Neto

Este cálculo es el que diferencia a FinCompare de una simple tabla de tasas. Se debe implementar con precisión desde el MVP.

```go
// CDT: Rendimiento neto después de retención en la fuente (15% en Colombia)
// Aplica sobre los intereses generados, no sobre el capital

func CDTRendimientoNeto(monto float64, tasaEA float64, dias int) RendimientoResult {
    // Convertir EA a tasa para el período específico
    tasaPeriodo := math.Pow(1+tasaEA/100, float64(dias)/365) - 1
    intereses   := monto * tasaPeriodo
    retencion   := intereses * 0.15  // Retención en la fuente
    neto        := intereses - retencion

    return RendimientoResult{
        MontoInicial: monto,
        Intereses:    intereses,
        Retencion:    retencion,
        Neto:         neto,
        TasaNetaEA:   tasaEA * 0.85,
        MontoFinal:   monto + neto,
    }
}
```

---

## 9. Checklist de Inicio Rápido

Antes de escribir una línea de código:

- [ ] Crear cuenta en [Financial Modeling Prep](https://financialmodelingprep.com) y obtener API key gratuita
- [ ] Crear cuenta en [Alpha Vantage](https://www.alphavantage.co) y obtener API key gratuita
- [ ] Registrarse en [datos.gov.co](https://www.datos.gov.co) y generar App Token de Socrata
- [ ] Crear cuenta en [ExchangeRate-API](https://www.exchangerate-api.com) para TRM
- [ ] Crear cuenta en [Render.com](https://render.com) (deploy backend)
- [ ] Crear cuenta en [Vercel](https://vercel.com) (deploy frontend)
- [ ] Inicializar repositorio Git con estructura de directorios descrita
- [ ] Configurar `docker-compose.yml` con PostgreSQL local
- [ ] Ejecutar primera migración y verificar conexión a DB

---

*FinCompare · Arquitectura Técnica v1.0 · Mayo 2026*
