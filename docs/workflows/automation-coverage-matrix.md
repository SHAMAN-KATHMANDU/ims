# Automation Coverage Matrix

Legend:

- `covered`: domain emits automation events and has practical action/runtime support
- `partial`: domain has some event coverage or is mainly a downstream action target
- `not covered`: no meaningful automation event publication today

| Module                   | Status      | Important events                                     | Emitters                                                                                                       | Action support                                                    | Tests                                                 |
| ------------------------ | ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| `deals`                  | covered     | deal created, stage changed                          | `apps/api/src/modules/deals/deal.service.ts`                                                                   | move stage, create activity, work items, notifications, webhooks  | service, workflow, automation runtime                 |
| `contacts`               | covered     | contact created, updated                             | `apps/api/src/modules/contacts/contact.service.ts`                                                             | contact update, field update, work items, notifications, webhooks | `contact.service.test.ts`                             |
| `companies`              | covered     | company created, updated                             | `apps/api/src/modules/companies/company.service.ts`                                                            | company update, field update, work items, notifications, webhooks | `company.service.test.ts`                             |
| `activities`             | partial     | activity created                                     | `apps/api/src/modules/activities/activity.service.ts`                                                          | activity create, webhooks, notifications                          | `activity.service.test.ts`                            |
| `leads`                  | covered     | lead created, assigned, converted                    | `apps/api/src/modules/leads/lead.service.ts`                                                                   | contact update, notifications, work items, webhooks               | `lead.service.test.ts`                                |
| `members`                | covered     | member created, updated, status changed              | `apps/api/src/modules/members/member.service.ts`                                                               | field update, work items, notifications, webhooks                 | `member.service.test.ts`                              |
| `tasks` and `work items` | covered     | work item created, completed                         | `apps/api/src/modules/tasks/task.service.ts`                                                                   | field update, notifications, webhooks                             | `task.service.test.ts`                                |
| `products`               | partial     | product created, updated                             | `apps/api/src/modules/products/product.service.ts`                                                             | field update, webhooks, notifications                             | `product.service.test.ts`                             |
| `categories`             | partial     | category created, updated                            | `apps/api/src/modules/categories/category.service.ts`                                                          | field update, webhooks, notifications                             | `category.service.test.ts`                            |
| `vendors`                | partial     | vendor created, updated                              | `apps/api/src/modules/vendors/vendor.service.ts`                                                               | field update, webhooks, notifications                             | `vendor.service.test.ts`                              |
| `locations`              | partial     | location created, updated                            | `apps/api/src/modules/locations/location.service.ts`                                                           | field update, webhooks, notifications                             | `location.service.test.ts`                            |
| `inventory`              | covered     | stock adjusted, set, low detected, threshold crossed | `apps/api/src/modules/inventory/inventory.service.ts`, `apps/api/src/modules/automation/automation.service.ts` | transfer draft, work items, notifications, webhooks               | `inventory.service.test.ts`, automation service tests |
| `transfers`              | covered     | transfer lifecycle events                            | `apps/api/src/modules/transfers/transfer.service.ts`                                                           | field update, work items, notifications, webhooks                 | `transfer.service` tests                              |
| `sales`                  | covered     | sale created, high value created, deleted            | `apps/api/src/modules/sales/sale.service.ts`                                                                   | work items, notifications, webhooks, field update                 | `sale.service.test.ts`                                |
| `notifications`          | partial     | action target only                                   | runtime notification action                                                                                    | send notifications                                                | `notification.service.test.ts`                        |
| `messaging`              | partial     | action-adjacent CRM context, no platform events yet  | none                                                                                                           | webhook and follow-up actions can react to CRM events             | messaging tests only                                  |
| `tenant-settings`        | not covered | none                                                 | none                                                                                                           | none                                                              | n/a                                                   |
| `media`                  | not covered | none                                                 | none                                                                                                           | none                                                              | n/a                                                   |

## Immediate Gaps Worth Tracking

- `messaging` still lacks first-class automation trigger publication.
- `notifications` has delivery as an action target, but no read/archive trigger publication.
- `products`, `categories`, `vendors`, and `locations` are now event sources but still rely mainly on generic field updates and webhook/work item actions.
- `tenant-settings` and `media` are intentionally left uncovered until concrete automation use cases emerge.

## Frontend Surface Checklist

| Surface                  | Status  | Notes                                                                     |
| ------------------------ | ------- | ------------------------------------------------------------------------- |
| Settings automation page | covered | main authoring surface                                                    |
| CRM workflow page        | partial | compatibility and migration surface                                       |
| Trigger conditions UI    | covered | now exposed in generic automation builder                                 |
| Scope pickers            | partial | pipeline and location pickers supported; product variation remains manual |
| Run history              | partial | inline recent runs available                                              |
| Replay failed events     | partial | replay exposed from recent runs when event linkage exists                 |
| Templates                | partial | starter templates added for sales, inventory, and CRM                     |

## Review Rule

When a new business module or major mutation is added, update this matrix and decide whether it should:

1. emit a new automation event
2. become an automation action target
3. stay intentionally out of scope
