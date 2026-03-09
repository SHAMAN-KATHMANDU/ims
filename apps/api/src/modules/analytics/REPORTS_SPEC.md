# Reports Section — Calculation Catalog & API Contract

This document is the single source of truth for all report calculations: DB sources, formulas, net/gross semantics, chart data shapes, and tenant scoping. Use it for implementation, review, and tests.

**See also:** [ANALYTICS_DATA_FLOW.md](./ANALYTICS_DATA_FLOW.md) for a comprehensive description of how each database call is made (repository/Prisma), what is returned, and how the service layer performs calculations for every analytics endpoint.

**Tenant scoping:** All report endpoints and export branches use tenant-scoped filters. Sale-based data uses `saleWhereForChildren` (from `saleWhereWithTenant(where, tenantId)`). Inventory-based data uses `locationInventoryWhereWithTenant(..., tenantId)`. Every method listed below is tenant-scoped.

### Tenant scoping checklist (verified)

| Report / Export                       | Service method        | Repository / filter                                                                                      | Scoped |
| ------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Sales & Revenue                       | getSalesRevenue       | getSalesRevenueData(saleWhereForChildren, saleWhereForChildren)                                          | Yes    |
| Sales Extended                        | getSalesExtended      | getSalesExtendedData(saleWhereForChildren)                                                               | Yes    |
| Financial                             | getFinancial          | getFinancialData(saleWhereForChildren)                                                                   | Yes    |
| Inventory Ops                         | getInventoryOps       | getInventoryOpsData(resolvedWhere), resolvedWhere = locationInventoryWhereWithTenant(invWhere, tenantId) | Yes    |
| Inventory Extended                    | getInventoryExtended  | getInventoryExtendedData(invWhere, saleWhereForChildren)                                                 | Yes    |
| Customers & Promos                    | getCustomersPromos    | getCustomersPromosData(saleWhereForChildren, saleWhereForChildren, ...)                                  | Yes    |
| Discount                              | getDiscountAnalytics  | getDiscountAnalyticsData(saleWhereForChildren)                                                           | Yes    |
| Payment Trends                        | getPaymentTrends      | getPaymentTrendsData(saleWhereForChildren)                                                               | Yes    |
| Location Comparison                   | getLocationComparison | getLocationComparisonData(saleWhereForChildren)                                                          | Yes    |
| Product Insights                      | getProductInsights    | getProductInsightsData(saleWhereForChildren, invWhere)                                                   | Yes    |
| Customer Insights                     | getCustomerInsights   | getCustomerInsightsData(saleWhereForChildren)                                                            | Yes    |
| Trends                                | getTrends             | getTrendsData(saleWhereForChildren)                                                                      | Yes    |
| Member Cohort                         | getMemberCohort       | getMemberCohortData(saleWhereForChildren)                                                                | Yes    |
| Export sales-revenue / sales-extended | exportAnalytics       | getSalesForExport(saleWhereForChildren)                                                                  | Yes    |
| Export inventory-ops                  | exportAnalytics       | getInventoryForExport(invWhere)                                                                          | Yes    |
| Export customers-promos               | exportAnalytics       | getCustomersPromosForExport(saleWhereForChildren, ...)                                                   | Yes    |
| Export trends                         | exportAnalytics       | getTrendsForExport(saleWhereForChildren)                                                                 | Yes    |
| Export financial                      | exportAnalytics       | getFinancialForExport(saleWhereForChildren)                                                              | Yes    |

---

## Report actions: when buttons are clicked, what APIs are hit

| User action                 | Report    | API hit                                                                                                                                                 | Reason                                                                                                                                                         |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Sales & Revenue        | Sales     | GET /analytics/sales-revenue, GET /analytics/sales-extended, GET /analytics/discount, GET /analytics/payment-trends, GET /analytics/location-comparison | useSalesRevenueAnalytics + useSalesExtendedAnalytics + useDiscountAnalytics + usePaymentTrendsAnalytics + useLocationComparisonAnalytics with shared apiParams |
| Change date/location filter | All       | Same GET endpoints with new query params                                                                                                                | apiParams from URL (useAnalyticsFilters) refetch all queries                                                                                                   |
| Click Download → Excel/CSV  | Any       | GET /analytics/export?type=&lt;section&gt;&format=excel\|csv&...                                                                                        | exportAnalytics(type, format, apiParams)                                                                                                                       |
| Drill into location/user    | Sales     | No new API                                                                                                                                              | Uses existing composition + userPerformance (client-side filter)                                                                                               |
| Open Financial              | Financial | GET /analytics/financial                                                                                                                                | useFinancialAnalytics(apiParams)                                                                                                                               |
| Open Inventory Ops          | Inventory | GET /analytics/inventory-ops, GET /analytics/inventory-extended                                                                                         | useInventoryOpsAnalytics + useInventoryExtendedAnalytics                                                                                                       |
| Open Customers & Promos     | Customers | GET /analytics/customers-promos, GET /analytics/member-cohort, GET /analytics/customer-insights, GET /analytics/product-insights                        | Four hooks with same apiParams                                                                                                                                 |
| Open Trends                 | Trends    | GET /analytics/trends, GET /analytics/sales-revenue                                                                                                     | useTrendsAnalytics + useSalesRevenueAnalytics                                                                                                                  |

---

## 1. Sales & Revenue

- **Route:** `/{workspace}/reports/analytics/sales`
- **On load:** GET /analytics/sales-revenue, GET /analytics/sales-extended, GET /analytics/discount, GET /analytics/payment-trends, GET /analytics/location-comparison (query params: dateFrom, dateTo, locationIds, saleType, creditStatus, userId, categoryId, vendorId from AnalyticsFilterBar).
- **On Download:** GET /analytics/export?type=sales-revenue&format=excel|csv&...

### Metrics (KPIs)

| Metric (UI label)  | Net or gross | DB source                                             | Calculation                                                                     |
| ------------------ | ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Total Revenue      | **Gross**    | Sale.subtotal (aggregate \_sum)                       | kpisAgg.\_sum.subtotal                                                          |
| Net Revenue        | **Net**      | Sale.total (aggregate \_sum)                          | kpisAgg.\_sum.total                                                             |
| Avg Order Value    | Net-based    | Sale.total, \_count                                   | netRevenue / salesCount                                                         |
| Gross Profit       | —            | From getSalesExtended                                 | totalRevenue - totalCogs (extData: sum of sale.total per sale, COGS from items) |
| Basket Size        | —            | SaleItem quantities / sales count                     | totalItems / salesCount (from getSalesExtended)                                 |
| Outstanding Credit | Net (unpaid) | Sale.total - sum(SalePayment.amount) for credit sales | For each credit sale: balance = total - paid; sum(positive balances)            |
| Revenue / Member   | Net          | Member sales aggregate                                | memberRevenue / distinctMembers (getSalesExtended)                              |
| Discount Ratio     | —            | Sale.discount, Sale.subtotal                          | (sum discount / sum subtotal) \* 100 (getSalesExtended)                         |
| Total Discount     | —            | Sale.discount (aggregate \_sum)                       | kpisAgg.\_sum.discount                                                          |

### Charts

| Chart title              | Data source                                       | Required keys                                | How series is built (service)                                                      |
| ------------------------ | ------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Revenue Over Time        | data.timeSeries                                   | date, gross, net, discount                   | dailyMap from salesForTimeSeries: per day sum(subtotal), sum(total), sum(discount) |
| Composition by Location  | data.composition.byLocation                       | locationId, locationName, revenue, count     | groupBy locationId, \_sum total                                                    |
| Composition by Payment   | data.composition.byPaymentMethod                  | method, revenue, count                       | SalePayment groupBy method                                                         |
| Composition by Type      | data.composition.bySaleType                       | type, revenue, count                         | Sale groupBy type                                                                  |
| Credit Over Time         | data.credit.timeSeries                            | date, issued, paid                           | creditSalesForAging by date; paymentsForCreditByDate by date                       |
| Credit Aging             | data.credit.aging                                 | "0-7", "8-30", "30+"                         | Balance per sale grouped by days overdue                                           |
| Revenue by Day of Week   | extData.dayOfWeek                                 | day, revenue, count                          | From getSalesExtended: dayOfWeek[dow].revenue += net                               |
| Revenue by Hour          | extData.hourOfDay                                 | hour, revenue, count                         | hourOfDay[hour].revenue += net                                                     |
| Payment Trends Over Time | paymentTrendsData (GET /analytics/payment-trends) | date + method keys                           | SalePayment by sale.createdAt date and method                                      |
| Location Comparison      | locationData (GET /analytics/location-comparison) | byLocation: locationId, \_sum total, \_count | Sale groupBy locationId                                                            |

**Consistency:** sum(timeSeries.gross) === kpis.totalRevenue; sum(timeSeries.net) === kpis.netRevenue.

---

## 2. Financial Analytics

- **Route:** `/{workspace}/reports/analytics/financial`
- **On load:** GET /analytics/financial
- **On Download:** GET /analytics/export?type=financial&format=excel|csv&...

### Metrics (KPIs)

| Metric (UI label)                              | Net or gross | DB source                              | Calculation                                                                                                          |
| ---------------------------------------------- | ------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Net Revenue (see Phase 2: was "Total Revenue") | **Net**      | Sale.total                             | Same as Sales & Revenue: dailyMap.revenue = sum of Sale.total per day; frontend sums grossProfitTimeSeries[].revenue |
| Total COGS                                     | —            | SaleItem quantity \* product.costPrice | Sum per item; dailyMap.cogs, then sum over series                                                                    |
| Gross Profit                                   | —            | Derived                                | totalRevenue (from series) - totalCogs                                                                               |
| Avg Margin                                     | —            | Derived                                | (totalGross / totalRevenue) \* 100                                                                                   |

**Note:** Financial "revenue" is **net** (line totals = after discount). UI must label as "Net Revenue" with sub "After discount (line totals)".

### Charts

| Chart title            | Data source                | Required keys                                   | How series is built                                                                                                                                                                    |
| ---------------------- | -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gross Profit Over Time | data.grossProfitTimeSeries | date, revenue, cogs, grossProfit, discountRatio | Per day: revenue = sum(Sale.total) (consistent with Sales & Revenue net); cogs = sum(qty*costPrice); discountRatio = (discount/subtotal)*100 per day from sale-level discount/subtotal |
| COGS by Category       | data.cogsByCategory        | category, cogs, revenue                         | categoryMap from sale items by product.category.name                                                                                                                                   |
| COGS by Location       | data.cogsByLocation        | locationId, locationName, cogs                  | locationCogsMap from sale items by sale.locationId                                                                                                                                     |
| Margin by Category     | data.marginByCategory      | category, revenue, cogs, margin, marginPct      | Same categoryMap; margin = revenue - cogs; marginPct = (margin/revenue)\*100                                                                                                           |
| Discount Ratio Trend   | data.grossProfitTimeSeries | date, discountRatio                             | v.subtotal > 0 ? (v.discount/v.subtotal)\*100 : 0                                                                                                                                      |

**Consistency:** sum(grossProfitTimeSeries[].revenue) === Financial "Net Revenue" KPI (frontend totals).

---

## 3. Inventory & Operations

- **Route:** `/{workspace}/reports/analytics/inventory`
- **On load:** GET /analytics/inventory-ops, GET /analytics/inventory-extended
- **On Download:** GET /analytics/export?type=inventory-ops&format=excel|csv&...

### Metrics (KPIs)

| Metric (UI label)  | Net or gross | DB source                                       | Calculation                                                     |
| ------------------ | ------------ | ----------------------------------------------- | --------------------------------------------------------------- |
| Stock Value (Cost) | —            | LocationInventory.quantity \* product.costPrice | Sum over all inventory items (tenant-scoped invWhere)           |
| Stock Value (MRP)  | —            | LocationInventory.quantity \* product.mrp       | Sum over all inventory items                                    |
| Low Stock          | —            | variationTotal per product                      | Count of variations where total qty < 5                         |
| Out of Stock       | —            | variationTotal                                  | Count of variations where total qty === 0                       |
| Turnover Ratio     | —            | From getInventoryExtended                       | totalCogs / totalInventoryCost (sold COGS / current stock cost) |
| Stock-to-Sales     | —            | From getInventoryExtended                       | totalInventoryCost / totalSalesValue (net)                      |
| Dead Stock Items   | —            | From getInventoryExtended                       | Products with stock > 0 and no sales in period (count)          |
| Avg Completion     | —            | Transfer completedAt - createdAt                | Avg over COMPLETED transfers (days)                             |

### Charts

| Chart title                 | Data source                   | Required keys                                                      | How series is built                                         |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Inventory Aging             | data.aging                    | "0-30", "31-60", "61-90", "90+"                                    | Stock value (qty\*mrp) bucketed by days since inv.createdAt |
| Category × Location Heatmap | data.heatmap                  | category, [location names], total                                  | categoryLocationValue[cat][loc] = sum(qty\*mrp)             |
| Transfer Funnel             | data.transferFunnel           | PENDING, APPROVED, IN_TRANSIT, COMPLETED                           | Transfer groupBy status \_count                             |
| Days on Hand                | extData.daysOnHand            | productId, productName, currentStock, dailySalesRate, daysOnHand   | stock.qty / (soldQty/daysInPeriod); 999 if no sales         |
| Dead Stock                  | extData.deadStock             | productId, productName, currentStock, stockValue                   | stockByProduct with qty>0 and no soldByProduct              |
| Sell-through by Location    | extData.sellThroughByLocation | locationId, locationName, unitsSold, currentStock, sellThroughRate | sold/(sold+stock)\*100 per location                         |

**Tenant scoping:** getInventoryOpsData(resolvedWhere) and getInventoryExtendedData(invWhere, saleWhereForChildren) use invWhere = locationInventoryWhereWithTenant(..., tenantId).

---

## 4. Customers & Promos

- **Route:** `/{workspace}/reports/analytics/customers`
- **On load:** GET /analytics/customers-promos, GET /analytics/member-cohort, GET /analytics/customer-insights, GET /analytics/product-insights
- **On Download:** GET /analytics/export?type=customers-promos&format=excel|csv&...

### Metrics (KPIs)

| Metric (UI label) | Net or gross | DB source                                                   | Calculation                                                                     |
| ----------------- | ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Total Members     | —            | Member.count()                                              | Raw count (not tenant-filtered at DB; tenant scope via sale filters where used) |
| New in Period     | —            | Member count where memberSince/createdAt in dateFrom-dateTo | getCustomersPromosData                                                          |
| Repeat %          | —            | membersWithSales with \_count > 1                           | (repeatCount / memberIdsWithSales.size) \* 100                                  |
| Avg CLV           | Net          | Member.totalSales (from getCustomerInsightsData)            | avg of totalSales for members with sales                                        |
| Retention Rate    | —            | Prev period vs current period members                       | retained / prevPeriodMembers.size \* 100                                        |
| Churn Rate        | —            | 100 - retentionRate                                         | When hasMeaningfulChurn                                                         |
| Avg Order Freq    | —            | Gaps between consecutive member sales                       | Mean of (sale[i].createdAt - sale[i-1].createdAt) in days                       |
| New vs Repeat Rev | Net          | Member first sale month vs sale month                       | newRevenue = sale in first month; returningRevenue else                         |

### Charts

Product performance, promos, cohort (new/repeat revenue), RFM segments, CLV distribution, member growth, new vs returning time series — all from getCustomersPromosData, getMemberCohortData, getCustomerInsightsData, getProductInsightsData. (Detail tables omitted for brevity; same doc can be extended.)

**Tenant scoping:** All use saleWhereForChildren for sale-based queries.

---

## 5. Trends & Patterns

- **Route:** `/{workspace}/reports/analytics/trends`
- **On load:** GET /analytics/trends, GET /analytics/sales-revenue (for comparison)
- **On Download:** GET /analytics/export?type=trends&format=excel|csv&...

### Metrics and charts

| Chart/series      | Data source           | Required keys                                                    | How built                                                                    |
| ----------------- | --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Monthly totals    | data.monthlyTotals    | month, revenue, count, discount, momGrowth                       | Sale by month: sum(total), count; momGrowth = (v.revenue - prev)/prev \* 100 |
| Seasonality index | data.seasonalityIndex | month, index                                                     | (m.revenue / overallAvg) \* 100                                              |
| Cohort retention  | data.cohortRetention  | cohortMonth, size, retention[{ monthOffset, activeCount, rate }] | By first purchase month; retention per month offset                          |
| Peak hours        | data.peakHours        | day, hours[{ hour, revenue }]                                    | peakHours[dayOfWeek][hour] += sale.total                                     |

**Revenue in Trends:** Net (Sale.total). All sale-based and tenant-scoped via saleWhereForChildren.

---

## Export types (tenant-scoped)

| type=                         | Backend branch                                                               | Data                                                                |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| sales-revenue, sales-extended | getSalesForExport(saleWhereForChildren)                                      | Sale list with items                                                |
| inventory-ops                 | getInventoryForExport(invWhere)                                              | LocationInventory list                                              |
| customers-promos              | getCustomersPromosForExport(saleWhereForChildren, saleWhereForChildren, ...) | Members, product perf, promos                                       |
| trends                        | getTrendsForExport(saleWhereForChildren)                                     | Sales + members for Excel                                           |
| financial                     | getFinancialForExport(saleWhereForChildren)                                  | SaleItem list, then same daily/category aggregation as getFinancial |

---

## Graph data shapes and filter alignment

- **Data shapes:** Each chart’s expected payload is documented in the "Charts" tables above (e.g. timeSeries: `date`, `gross`, `net`, `discount`; grossProfitTimeSeries: `date`, `revenue`, `cogs`, `grossProfit`, `discountRatio`). Backend returns these keys; frontend must not expect different names.
- **Filter alignment:** All series on a report page use the same filters. The frontend passes a single `apiParams` (from URL/useAnalyticsFilters) to every analytics hook on that page, so dateFrom, dateTo, locationIds, etc. are identical for all requests.
- **Sanity (backend tests):** Service tests assert that timeSeries is sorted by date and that gross/net/discount are non-negative; and that sum(timeSeries.gross) === kpis.totalRevenue and sum(timeSeries.net) === kpis.netRevenue for Sales Revenue, and sum(grossProfitTimeSeries.revenue) matches expected net revenue for Financial.

---

## Net vs gross — rules

- **Gross:** Sale.subtotal (before discount). Used in Sales & Revenue "Total Revenue" and timeSeries.gross.
- **Net:** Sale.total. Used in Sales & Revenue "Net Revenue", timeSeries.net, Financial "Net Revenue" and grossProfitTimeSeries.revenue (sale-level total per day for consistency), Trends monthly revenue, and all composition revenue fields that use Sale.total or payment amounts.
- **Explicit UI:** Sales & Revenue: "Total Revenue" = Gross (sub "Before discount" or "Gross"); "Net Revenue" = Net (sub "After discount"). Financial: "Net Revenue" = Net (sub "After discount (same as Sales & Revenue)").
