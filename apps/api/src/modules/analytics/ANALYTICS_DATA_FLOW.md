# Analytics: Database Calls and Calculations

This document describes how each analytics endpoint fetches data (repository/DB), what is returned, and how the service layer performs calculations. It is the single reference for "how each database call is made, what gets returned, and how calculations are performed."

---

## 1. Filter and where-clause layer

All sale-based analytics use the same filter pipeline:

- **`getSalesWhereForAnalytics(query, role, currentUserId)`** (from `analytics.filters`): Builds a Prisma `SaleWhereInput` from query params (`dateFrom`, `dateTo`, `locationIds`, `saleType`, `creditStatus`, `userId`, `categoryId`, `vendorId`) and applies role-based scoping (e.g. `user` role sees only `createdById === currentUserId`).
- **`saleWhereWithTenant(where, tenantId)`**: Adds `tenantId` to the where clause so data is tenant-scoped.
- **`parseAnalyticsFilters(query)`**: Returns parsed `{ dateFrom, dateTo, locationIds, ... }` for use in service logic (e.g. date ranges for retention).
- **`locationInventoryWhereWithTenant(invWhere, tenantId)`**: For inventory endpoints, builds `LocationInventoryWhereInput` with tenant applied via `location.tenantId`.

Repository methods receive these `where` objects; they do not interpret query params directly.

---

## 2. Sales & Revenue — GET /analytics/sales-revenue

**Controller:** `getSalesRevenue` → **Service:** `getSalesRevenue(query, role, currentUserId, tenantId)` → **Repository:** `getSalesRevenueData(saleWhereForChildren, saleWhereForChildren)`.

### 2.1 Database calls (repository)

All run in a single `Promise.all` (plus two follow-up lookups):

| #   | Prisma call                                                                                             | Purpose                                                |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `prisma.sale.aggregate({ where, _sum: { subtotal, total, discount }, _count: true })`                   | KPIs: totals and sale count                            |
| 2   | `prisma.sale.findMany({ where, select: { subtotal, total, discount, createdAt }, orderBy: createdAt })` | Daily time series (gross/net/discount per day)         |
| 3   | `prisma.sale.groupBy({ by: ["locationId"], where, _sum: { total }, _count })`                           | Composition by location                                |
| 4   | `prisma.salePayment.groupBy({ by: ["method"], where: { sale }, _sum: { amount }, _count })`             | Composition by payment method                          |
| 5   | `prisma.sale.groupBy({ by: ["type"], where, _sum: { total }, _count })`                                 | Composition by sale type                               |
| 6   | `prisma.sale.findMany({ where: creditWhere, select: { id, total } })`                                   | Credit sales for outstanding balance                   |
| 7   | `prisma.sale.findMany({ where: creditWhere, select: { id, total, createdAt } })`                        | Credit sales for aging + time series                   |
| 8   | `prisma.salePayment.groupBy({ by: ["saleId"], where: { sale: credit }, _sum: { amount } })`             | Payments per credit sale (for balance)                 |
| 9   | `prisma.salePayment.findMany({ where: { sale: credit }, select: { amount, createdAt } })`               | Payments by date (credit over time)                    |
| 10  | `prisma.sale.groupBy({ by: ["createdById"], where, _sum: { total, discount }, _count })`                | User performance                                       |
| 11  | `prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id, name } })`                | Location names (after extracting IDs from composition) |
| 12  | `prisma.user.findMany({ where: { id: { in: userIds } }, select: { id, username } })`                    | User names for user performance                        |

**Raw return:** `{ kpisAgg, salesForTimeSeries, compositionByLocation, compositionByPayment, compositionByType, creditSalesForOutstanding, creditSalesForAging, paymentsBySaleId, paymentsForCreditByDate, userPerformanceRaw, locations, users }`.

### 2.2 Service calculations

- **KPIs:** `totalRevenue = kpisAgg._sum.subtotal`, `netRevenue = kpisAgg._sum.total`, `totalDiscount = kpisAgg._sum.discount`, `salesCount = kpisAgg._count`, `avgOrderValue = netRevenue / salesCount`.
- **Outstanding credit:** For each credit sale, `balance = sale.total - sum(payments for that saleId)`; sum all positive balances.
- **Time series:** Loop over `salesForTimeSeries`; group by `createdAt` date (YYYY-MM-DD); per day sum `subtotal` → gross, `total` → net, `discount` → discount. Sort by date.
- **Credit time series:** From `creditSalesForAging` build `issued` by date; from `paymentsForCreditByDate` build `paid` by date; merge date sets and output `{ date, issued, paid }`.
- **Credit aging:** For each credit sale with unpaid balance, compute days since `createdAt`; bucket into 0–7, 8–30, 30+ days; sum balances per bucket.
- **Composition:** Map location/user IDs to names; expose `revenue` (= \_sum.total or \_sum.amount), `count` (= \_count).
- **User performance:** `avgDiscount = _sum.discount / _count` per user.

### 2.3 API response shape

`{ kpis: { totalRevenue, netRevenue, salesCount, avgOrderValue, totalDiscount, outstandingCredit }, timeSeries: [{ date, gross, net, discount }], composition: { byLocation, byPaymentMethod, bySaleType }, credit: { timeSeries, aging }, userPerformance }`.

---

## 3. Sales Extended — GET /analytics/sales-extended

**Controller:** `getSalesExtended` → **Service:** `getSalesExtended(...)` → **Repository:** `getSalesExtendedData(saleWhereForChildren)`.

### 3.1 Database calls

| #   | Prisma call                                                                                                                                                                                              | Purpose                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | `prisma.sale.findMany({ where, select: { id, subtotal, total, discount, createdAt, memberId, items: { select: { quantity, lineTotal, variation: { product: { costPrice } } } } }, orderBy: createdAt })` | All sales with line items and cost for COGS       |
| 2   | `prisma.sale.groupBy({ by: ["memberId"], where: { ...where, memberId: { not: null } }, _sum: { total }, _count })`                                                                                       | Member-level revenue/count for revenue-per-member |

**Raw return:** `{ salesWithItems, memberSalesAgg }`.

### 3.2 Service calculations

- **Monthly aggregates:** Group sales by `YYYY-MM`; per month sum subtotal (gross), total (net), discount, count.
- **Growth rates:** For each month, `growthPct = ((current net - previous month net) / previous month net) * 100`.
- **Day of week:** Array of 7 (Sun–Sat); for each sale add `sale.total` and count to `dayOfWeek[d.getDay()]`.
- **Hour of day:** Array of 24; for each sale add `sale.total` and count to `hourOfDay[d.getHours()]`.
- **Basket:** `totalItems = sum(item.quantity)` over all items; `avgBasketSize = totalItems / salesCount`.
- **Gross profit / margin:** `totalRevenue = sum(sale.total)`; `totalCogs = sum(quantity * costPrice)` per item; `grossProfit = totalRevenue - totalCogs`; `grossMargin = (grossProfit / totalRevenue) * 100`.
- **Discount ratio:** `(sum(sale.discount) / sum(sale.subtotal)) * 100`.
- **Revenue per member:** `memberRevenue = sum(memberSalesAgg._sum.total)`; `distinctMembers = memberSalesAgg.length`; `revenuePerMember = memberRevenue / distinctMembers`.

### 3.3 API response shape

`{ monthlyAggregates, growthRates, basketMetrics: { avgBasketSize, totalItems, totalSales }, dayOfWeek, hourOfDay, grossProfit, grossMargin, revenuePerMember, discountRatio }`.

---

## 4. Discount Analytics — GET /analytics/discount

**Controller:** `getDiscountAnalytics` → **Service:** `getDiscountAnalytics(...)` → **Repository:** `getDiscountAnalyticsData(saleWhereForChildren)`.

### 4.1 Database calls

| #   | Prisma call                                                                              | Purpose                          |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `prisma.sale.findMany({ where, select: { discount, createdAt }, orderBy: createdAt })`   | Discount by sale for time series |
| 2   | `prisma.sale.groupBy({ by: ["createdById"], where, _sum: { discount } })`                | Discount by user                 |
| 3   | `prisma.sale.groupBy({ by: ["locationId"], where, _sum: { discount } })`                 | Discount by location             |
| 4   | `prisma.user.findMany({ where: { id: { in: userIds } }, select: { id, username } })`     | User names                       |
| 5   | `prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id, name } })` | Location names                   |

**Raw return:** `{ salesForTimeSeries, byUser, byLocation, users, locations }`.

### 4.2 Service calculations

- **Discount over time:** Group `salesForTimeSeries` by date (YYYY-MM-DD); sum `discount` per day; sort by date; output `[{ date, discount }]`.
- **By user / by location:** Map IDs to names; output `{ userId/userName or locationId/locationName, discount }`.

### 4.3 API response shape

`{ discountOverTime, byUser: [{ userId, username, discount }], byLocation: [{ locationId, locationName, discount }] }`.

---

## 5. Payment Trends — GET /analytics/payment-trends

**Controller:** `getPaymentTrends` → **Service:** `getPaymentTrends(...)` → **Repository:** `getPaymentTrendsData(saleWhereForChildren)`.

### 5.1 Database call

- **Single call:** `prisma.salePayment.findMany({ where: { sale: saleWhereForChildren }, select: { method, amount, sale: { select: { createdAt } } } })`.

**Raw return:** Array of `{ method, amount, sale: { createdAt } }`.

### 5.2 Service calculations

- Build `byDate[date][method] += amount` using `sale.createdAt` date (YYYY-MM-DD).
- Output time series: `[{ date, CASH: n, CARD: m, ... }]` sorted by date.

### 5.3 API response shape

`{ timeSeries: [{ date, ...methodAmounts }] }`.

---

## 6. Location Comparison — GET /analytics/location-comparison

**Controller:** `getLocationComparison` → **Service:** `getLocationComparison(...)` → **Repository:** `getLocationComparisonData(saleWhereForChildren)`.

### 6.1 Database calls

| #   | Prisma call                                                                              | Purpose                               |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | `prisma.sale.groupBy({ by: ["locationId"], where, _sum: { total, discount }, _count })`  | Revenue, discount, count per location |
| 2   | `prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id, name } })` | Location names                        |

**Raw return:** `{ byLocation, locations }`.

### 6.2 Service calculations

- Map each `byLocation` row to `{ locationId, locationName, revenue: _sum.total, salesCount: _count, discount: _sum.discount }`.

### 6.3 API response shape

Array of `{ locationId, locationName, revenue, salesCount, discount }`.

---

## 7. Financial — GET /analytics/financial

**Controller:** `getFinancial` → **Service:** `getFinancial(...)` → **Repository:** `getFinancialData(saleWhereForChildren)`.

### 7.1 Database calls

| #   | Prisma call                                                                                                                                                                                                                                   | Purpose                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `prisma.saleItem.findMany({ where: { sale: saleWhereForChildren }, select: { quantity, lineTotal, variation: { product: { costPrice, categoryId, category: { name } } }, sale: { id, createdAt, locationId, discount, subtotal, total } } })` | All line items with sale and product/category for COGS and revenue |
| 2   | `prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id, name } })`                                                                                                                                                      | Location names                                                     |

**Raw return:** `{ saleItems, locations }`.

### 7.2 Service calculations

- **Daily map (revenue from sale total for consistency with Sales & Revenue):** First loop over items: fill `dailyMap[date].cogs += quantity * costPrice`; fill `categoryMap[catName]` with line revenue and COGS; fill `locationCogsMap[locationId]` with COGS. Second loop over items (unique sales via `processedSaleIds`): for each sale add `sale.total` to `dailyMap[date].revenue`, and add `sale.discount` / `sale.subtotal` for discount ratio.
- **Gross profit time series:** For each date, `revenue` (from sale totals), `cogs`, `grossProfit = revenue - cogs`, `discountRatio = (discount / subtotal) * 100` when subtotal > 0.
- **cogsByCategory:** From categoryMap: `{ category, cogs, revenue }` sorted by cogs descending.
- **cogsByLocation:** From locationCogsMap + location names, sorted by cogs descending.
- **marginByCategory:** From categoryMap: `margin = revenue - cogs`, `marginPct = (margin / revenue) * 100`, sorted by marginPct descending.

### 7.3 API response shape

`{ grossProfitTimeSeries: [{ date, revenue, cogs, grossProfit, discountRatio }], cogsByCategory, cogsByLocation, marginByCategory }`.

---

## 8. Inventory & Operations — GET /analytics/inventory-ops

**Controller:** `getInventoryOps` → **Service:** `getInventoryOps(query, tenantId)` → **Repository:** `getInventoryOpsData(resolvedWhere)`.

### 8.1 Database calls

| #   | Prisma call                                                                                                                                                                  | Purpose                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | `prisma.locationInventory.findMany({ where: invWhere, include: { variation: { include: { product: { costPrice, mrp, categoryId, category } } }, location: { id, name } } })` | All inventory rows with product and location |
| 2   | `prisma.transfer.groupBy({ by: ["status"], _count })`                                                                                                                        | Transfer funnel counts                       |
| 3   | `prisma.transfer.findMany({ where: { status: "COMPLETED", completedAt: { not: null } }, select: { createdAt, completedAt } })`                                               | For average completion time                  |

**Raw return:** `{ inventoryItems, transferCounts, completedTransfers }`.

### 8.2 Service calculations

- **Stock value:** Sum over inventory `qty * costPrice` → totalStockValueCost, `qty * mrp` → totalStockValueMrp.
- **Per-variation quantity:** `variationTotal[variationId] += quantity`.
- **Category × location heatmap:** `categoryLocationValue[categoryName][locationName] += quantity * mrp`.
- **Aging buckets:** For each item, `days = (now - createdAt) / 1 day`; bucket MRP value into 0–30, 31–60, 61–90, 90+ days; sum values per bucket.
- **Low/out of stock:** Count variations with `variationTotal === 0` (out of stock) or `< LOW_STOCK_THRESHOLD` (low stock).
- **Transfer funnel:** Map `transferCounts` by status to `{ PENDING, APPROVED, IN_TRANSIT, COMPLETED }`.
- **Avg completion days:** From `completedTransfers`, `avgCompletionMs = sum(completedAt - createdAt) / count`; convert to days.

### 8.3 API response shape

`{ kpis: { totalStockValueCost, totalStockValueMrp, lowStockCount, outOfStockCount, deadStockValue }, healthQuadrant, heatmap, aging: { "0-30", "31-60", "61-90", "90+" }, transferFunnel, avgTransferCompletionDays }`.

---

## 9. Customers & Promos — GET /analytics/customers-promos

**Controller:** `getCustomersPromos` → **Service:** `getCustomersPromos(...)` → **Repository:** `getCustomersPromosData(saleWhereForChildren, saleWhereForChildren, dateFrom, dateTo)`.

### 9.1 Database calls

| #   | Prisma call                                                                                                                 | Purpose                          |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `prisma.member.count()`                                                                                                     | Total members                    |
| 2   | `prisma.member.count({ where: { OR: [memberSince, createdAt] in [dateFrom, dateTo] } })` (if dates set)                     | New members in period            |
| 3   | `prisma.sale.groupBy({ by: ["memberId"], where: { ...salesWhere, memberId: { not: null } }, _count })`                      | Sales per member (for repeat %)  |
| 4   | `prisma.saleItem.groupBy({ by: ["variationId"], where: { sale }, _sum: { lineTotal, quantity }, _count })`                  | Product performance by variation |
| 5   | `prisma.promoCode.findMany({ where: { isActive: true }, select: { id, code, usageCount, value } })`                         | Active promos                    |
| 6   | `prisma.productVariation.findMany({ where: { id: { in: variationIds } }, include: { product: { costPrice, name, ... } } })` | Variation/product details        |

**Raw return:** `{ memberCount, newMembersInPeriod, membersWithSales, productPerformanceRaw, promoCodes, variations }`.

### 9.2 Service calculations

- **Repeat percent:** Members with `_count > 1` / total members with sales × 100.
- **Product performance:** For each variation, `revenue = _sum.lineTotal`, `quantity = _sum.quantity`, `margin = revenue - quantity * costPrice`; join product name from variations.
- **Promo effectiveness:** Map promos to `{ code, usageCount, value }`; total usage count = sum of usageCount.

### 9.3 API response shape

`{ memberKpis: { totalMembers, newInPeriod, repeatPercent }, cohort: [], productPerformance, promoEffectiveness: { promos, totalUsageCount } }`.

---

## 10. Member Cohort — GET /analytics/member-cohort

**Controller:** `getMemberCohort` → **Service:** `getMemberCohort(...)` → **Repository:** `getMemberCohortData(saleWhereForChildren)`.

### 10.1 Database call

- **Single call:** `prisma.sale.groupBy({ by: ["memberId"], where: { ...where, memberId: { not: null } }, _count, _sum: { total } })`.

**Raw return:** Array of `{ memberId, _count, _sum: { total } }`.

### 10.2 Service calculations

- **New vs repeat:** `_count === 1` → newCount/newRevenue; else repeatCount/repeatRevenue.

### 10.3 API response shape

`{ newCount, repeatCount, newRevenue, repeatRevenue }`.

---

## 11. Customer Insights — GET /analytics/customer-insights

**Controller:** `getCustomerInsights` → **Service:** `getCustomerInsights(...)` → **Repository:** `getCustomerInsightsData(saleWhereForChildren)`.

### 11.1 Database calls

| #   | Prisma call                                                                                                                                                             | Purpose                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | `prisma.member.findMany({ select: { id, totalSales, createdAt, firstPurchase, memberSince, sales: { where, select: { id, total, createdAt }, orderBy: createdAt } } })` | Members with their filtered sales for CLV, RFM, retention |
| 2   | `prisma.member.findMany({ select: { id, createdAt } })`                                                                                                                 | All members for growth by signup month                    |

**Raw return:** `{ membersWithSales, allMembers }`.

### 11.2 Service calculations

- **CLV:** `avgClv = mean(member.totalSales)`; bucket members into 0–1K, 1K–5K, 5K–10K, 10K–25K, 25K–50K, 50K+.
- **RFM:** Per member with sales: recency (days since last sale), frequency (sale count), monetary (sum of sale.total). Quintile scores (1–5) for R (inverse), F, M; segment labels (Champions, Loyal, New Customers, etc.) from score combinations; aggregate count and revenue per segment.
- **Avg order frequency:** Inter-purchase intervals (days) between consecutive sales per member; average across all intervals.
- **Member growth:** Group allMembers by `createdAt` month; count per month.
- **Retention/churn:** If date range set, previous period members (sales in prev period) vs current period members; retained = intersection; retentionRate = retained/prev; churnRate = 100 - retentionRate.
- **New vs returning time series:** For each member, first sale month; per sale, if sale month === first sale month → newRevenue else returningRevenue; group by month.

### 11.3 API response shape

`{ clvDistribution, avgClv, retentionRate, churnRate, hasMeaningfulChurn, rfmSegments, avgOrderFrequencyDays, memberGrowth, newVsReturningTimeSeries }`.

---

## 12. Product Insights — GET /analytics/product-insights

**Controller:** `getProductInsights` → **Service:** `getProductInsights(...)` → **Repository:** `getProductInsightsData(saleWhereForChildren, invWhere)`.

### 12.1 Database calls

| #   | Prisma call                                                                                                                                                                            | Purpose                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | `prisma.saleItem.findMany({ where: { sale }, select: { saleId, variationId, quantity, lineTotal, variation: { product: { id, name, costPrice, categoryId, category: { name } } } } })` | Line items for product revenue/quantity/cost |
| 2   | `prisma.locationInventory.findMany({ where: invWhere, select: { variationId, quantity } })`                                                                                            | Current stock by variation                   |
| 3   | `prisma.category.findMany({ select: { id, name } })`                                                                                                                                   | Categories (used in repo for join)           |

**Raw return:** `{ saleItemsRaw, inventoryItems, categories }`.

### 12.2 Service calculations

- **Product map:** Group by product id; sum revenue (lineTotal), quantity, cost (quantity \* costPrice); category name.
- **ABC classification:** Sort products by revenue descending; cumulative revenue %; grade A ≤80%, B ≤95%, C >95%.
- **Sell-through rate:** Sold = sum quantity by product from sales; stock = sum quantity by variation then map to product; rate = sold / (sold + stock) × 100.
- **Co-purchase pairs:** For each sale, product set; for each pair in set, increment pair count; top 20 pairs by frequency.
- **Revenue by category:** From product map, group by category; sum revenue, cost, quantity; margin = revenue - cost.

### 12.3 API response shape

`{ abcClassification, sellThroughRates, coPurchasePairs, revenueByCategory }`.

---

## 13. Inventory Extended — GET /analytics/inventory-extended

**Controller:** `getInventoryExtended` → **Service:** `getInventoryExtended(...)` → **Repository:** `getInventoryExtendedData(invWhere, saleWhereForChildren)`.

### 13.1 Database calls

| #   | Prisma call                                                                                                                                         | Purpose                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `prisma.locationInventory.findMany({ where: invWhere, include: { variation: { product: { id, name, costPrice, mrp } } }, location: { id, name } })` | Inventory with product and location        |
| 2   | `prisma.saleItem.findMany({ where: { sale }, select: { quantity, variation: { product: { id, costPrice } } }, sale: { locationId } } })`            | Sold quantities and cost for velocity/COGS |
| 3   | `prisma.location.findMany({ where: { isActive: true }, select: { id, name } })`                                                                     | Locations                                  |

**Raw return:** `{ inventoryItems, saleItems, locations }`.

### 13.2 Service calculations

- **Stock by product:** From inventoryItems, sum quantity and cost value per product.
- **Days in period:** From filter dateFrom/dateTo or default to current month.
- **Velocity, days on hand, dead stock:** Uses sold quantity and stock; velocity = sold / daysInPeriod; days on hand = stock / velocity when velocity > 0; dead stock logic as implemented (e.g. zero velocity or threshold).
- **Sell-through by location:** From saleItems grouped by product and location; sell-through rate per product per location.

### 13.3 API response shape

(Shape depends on implementation; typically includes velocity, days on hand, sell-through by location, etc.)

---

## 14. Trends — GET /analytics/trends

**Controller:** `getTrends` → **Service:** `getTrends(...)` → **Repository:** `getTrendsData(saleWhereForChildren)`.

### 14.1 Database calls

| #   | Prisma call                                                                                                              | Purpose                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1   | `prisma.sale.findMany({ where, select: { total, subtotal, discount, createdAt }, orderBy: createdAt })`                  | Sales for monthly and peak-hour aggregation  |
| 2   | `prisma.member.findMany({ select: { id, firstPurchase, sales: { where, select: { createdAt }, orderBy: createdAt } } })` | Members with sale dates for cohort retention |

**Raw return:** `{ sales, membersWithSales }`.

### 14.2 Service calculations

- **Monthly totals:** Group sales by YYYY-MM; sum revenue (total), count, discount; compute MoM growth % vs previous month.
- **Seasonality index:** Overall average monthly revenue; per month index = (month revenue / overall avg) × 100.
- **Peak hours:** 7×24 grid (day of week × hour); for each sale add sale.total to `peakHours[day][hour]`; output with day names and rounded revenue per hour.
- **Cohort retention:** For each member, first sale month = cohort; for each sale month, month offset from cohort; build sets of active member IDs per (cohort, offset); retention rate = (active count at offset / cohort size) × 100.

### 14.3 API response shape

`{ monthlyTotals: [{ month, revenue, count, discount, momGrowth }], seasonalityIndex, cohortRetention, peakHours }`.

---

## 15. Exports

Exports reuse the same filter/where pipeline. They call repository methods such as `getSalesForExport`, `getInventoryForExport`, `getCustomersPromosForExport`, `getTrendsForExport`, `getFinancialForExport` (same shape as getFinancialData). Data is then written to Excel/CSV; calculations mirror the corresponding GET endpoint (e.g. financial export builds the same dailyMap/category/location aggregates as getFinancial).

---

## Summary table

| Endpoint            | Repository method(s)      | Main DB entities                                                                         | Key calculations                                                                      |
| ------------------- | ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| sales-revenue       | getSalesRevenueData       | Sale (aggregate, findMany, groupBy), SalePayment, Location, User                         | KPIs from aggregate; time series from sales; credit aging from payments vs sale total |
| sales-extended      | getSalesExtendedData      | Sale (with items), Sale groupBy memberId                                                 | Monthly/growth, day/hour buckets, basket, gross profit, revenue per member            |
| discount            | getDiscountAnalyticsData  | Sale (findMany, groupBy), User, Location                                                 | Daily discount sum; by user/location                                                  |
| payment-trends      | getPaymentTrendsData      | SalePayment (with sale.createdAt)                                                        | By date × method                                                                      |
| location-comparison | getLocationComparisonData | Sale groupBy locationId, Location                                                        | Revenue, count, discount per location                                                 |
| financial           | getFinancialData          | SaleItem (with sale, variation.product), Location                                        | Daily revenue (sale.total), COGS, margin; category/location breakdowns                |
| inventory-ops       | getInventoryOpsData       | LocationInventory, Transfer                                                              | Stock value, aging buckets, funnel, avg completion                                    |
| customers-promos    | getCustomersPromosData    | Member, Sale groupBy memberId, SaleItem groupBy variationId, PromoCode, ProductVariation | Repeat %, product performance, promo usage                                            |
| member-cohort       | getMemberCohortData       | Sale groupBy memberId                                                                    | New vs repeat count/revenue                                                           |
| customer-insights   | getCustomerInsightsData   | Member (with sales), Member (all)                                                        | CLV, RFM segments, retention/churn, new vs returning                                  |
| product-insights    | getProductInsightsData    | SaleItem, LocationInventory, Category                                                    | ABC, sell-through, co-purchase, revenue by category                                   |
| inventory-extended  | getInventoryExtendedData  | LocationInventory, SaleItem, Location                                                    | Velocity, days on hand, sell-through by location                                      |
| trends              | getTrendsData             | Sale, Member (with sales)                                                                | Monthly totals, MoM growth, seasonality, cohort retention, peak hours                 |

This document should be updated whenever a new analytics endpoint is added or when DB calls or calculations change.
