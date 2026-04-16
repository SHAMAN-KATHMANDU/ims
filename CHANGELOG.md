# Changelog

## [1.1.0](https://github.com/SHAMAN-KATHMANDU/ims/compare/v1.0.0...v1.1.0) (2026-04-16)


### Features

* **ai:** ai-integration ([#323](https://github.com/SHAMAN-KATHMANDU/ims/issues/323)) ([244f0e2](https://github.com/SHAMAN-KATHMANDU/ims/commit/244f0e2f21352c356e653e7be5ad6cf7832e7e6c))
* **api,deploy:** credential encryption validation and Messenger Graph errors ([#341](https://github.com/SHAMAN-KATHMANDU/ims/issues/341)) ([7962c84](https://github.com/SHAMAN-KATHMANDU/ims/commit/7962c84fd95cb3d2112b5f452784a76d7a1e4241))
* **api,web:** add s3 media library and contact attachments ([#324](https://github.com/SHAMAN-KATHMANDU/ims/issues/324)) ([e46d0f5](https://github.com/SHAMAN-KATHMANDU/ims/commit/e46d0f5c6fde60ed25d6250b9b424368d49ad054))
* **api,web:** harden S3 media upload edge cases ([#325](https://github.com/SHAMAN-KATHMANDU/ims/issues/325)) ([59d3da9](https://github.com/SHAMAN-KATHMANDU/ims/commit/59d3da9b8b90742b12e5b2cf87e4ec633232aba0))
* **automation:** cart.abandoned event + ping-driven sweep ([#369](https://github.com/SHAMAN-KATHMANDU/ims/issues/369)) ([a53d036](https://github.com/SHAMAN-KATHMANDU/ims/commit/a53d03643f70da5d77ba27fb3782c2750b9fe46d))
* **automation:** linked branching editor, composable timeline, main merge ([#347](https://github.com/SHAMAN-KATHMANDU/ims/issues/347)) ([4a27d51](https://github.com/SHAMAN-KATHMANDU/ims/commit/4a27d51871857d99d19248ca1f1e2ade7a1b757b))
* **automation:** phase 3 flow graph persistence and branching UI ([#342](https://github.com/SHAMAN-KATHMANDU/ims/issues/342)) ([97a3a77](https://github.com/SHAMAN-KATHMANDU/ims/commit/97a3a776809a070d4996a1b9f1cee6774c5b4363))
* **blog:** tenant-scoped blog system (Phase A) ([#353](https://github.com/SHAMAN-KATHMANDU/ims/issues/353)) ([5777d2e](https://github.com/SHAMAN-KATHMANDU/ims/commit/5777d2eae8900d8de7ecb328901dc767b5ef714c))
* **cart:** guest cart + checkout on tenant-site (E.2) ([#364](https://github.com/SHAMAN-KATHMANDU/ims/issues/364)) ([1071099](https://github.com/SHAMAN-KATHMANDU/ims/commit/10710992a5adbe61e5662e2c4c3f699f93bd4112))
* **crm:** add workflow runs and derive contact journey types ([#336](https://github.com/SHAMAN-KATHMANDU/ims/issues/336)) ([3b3b85e](https://github.com/SHAMAN-KATHMANDU/ims/commit/3b3b85edfef51e8ef64bef45064bd5be1424adcd))
* **crm:** enable Tasks env flag in staging and production ([#319](https://github.com/SHAMAN-KATHMANDU/ims/issues/319)) ([53fbe05](https://github.com/SHAMAN-KATHMANDU/ims/commit/53fbe053ff1c1f7a32acfbd994ccd47b476f4eb6))
* **crm:** gate deals UI and queries behind CRM_DEALS flag ([#315](https://github.com/SHAMAN-KATHMANDU/ims/issues/315)) ([14d71da](https://github.com/SHAMAN-KATHMANDU/ims/commit/14d71dab32a77c7febfc17a154c90b5fb77187fe))
* **crm:** overhaul pipeline defaults, lifecycle, and UX ([#335](https://github.com/SHAMAN-KATHMANDU/ims/issues/335)) ([6f1cd86](https://github.com/SHAMAN-KATHMANDU/ims/commit/6f1cd86568354ef76f3c98d2af6342f9eb7b8a80))
* **crm:** workflow rule selects use shared metadata and merge main ([#339](https://github.com/SHAMAN-KATHMANDU/ims/issues/339)) ([ef7dddd](https://github.com/SHAMAN-KATHMANDU/ims/commit/ef7ddddeeace170368d4cab38387aa9fdfc64a7b))
* **editor:** editor UI + tenant page rendering (Phase C.5) ([#360](https://github.com/SHAMAN-KATHMANDU/ims/issues/360)) ([6f15e88](https://github.com/SHAMAN-KATHMANDU/ims/commit/6f15e88a5242e545ca3064e5ed3b012240322b69))
* **flags,media:** unlock staging and add MEDIA_UPLOAD env gate ([#327](https://github.com/SHAMAN-KATHMANDU/ims/issues/327)) ([dce5309](https://github.com/SHAMAN-KATHMANDU/ims/commit/dce5309b2495ca040750eab1e620e87e8fef801e))
* **media:** wire MediaPickerField into logo, favicon, and blog hero (Phase B) ([#354](https://github.com/SHAMAN-KATHMANDU/ims/issues/354)) ([01e5b5f](https://github.com/SHAMAN-KATHMANDU/ims/commit/01e5b5f8e7b5b38dd3132f1e7d4cbc509fc0a46a))
* **messaging:** media uploads, reactions, reply/edit + product & sales enhancements ([#314](https://github.com/SHAMAN-KATHMANDU/ims/issues/314)) ([7c0abee](https://github.com/SHAMAN-KATHMANDU/ims/commit/7c0abeef7de4acb215ff932fcb73f1339090a254))
* multi-location convert-to-sale + browser dialogs + 401 dedup + API tests ([#383](https://github.com/SHAMAN-KATHMANDU/ims/issues/383)) ([4c1f2db](https://github.com/SHAMAN-KATHMANDU/ims/commit/4c1f2db781cc70b997b26dde2e6188d73eaf8be8))
* **orders:** admin UI for website orders (E.3) ([#365](https://github.com/SHAMAN-KATHMANDU/ims/issues/365)) ([d19c7c8](https://github.com/SHAMAN-KATHMANDU/ims/commit/d19c7c80e7f890e4eadf7e44fb5e5cea221e1ef9))
* **orders:** in-app notifications for guest orders (F.2) ([#367](https://github.com/SHAMAN-KATHMANDU/ims/issues/367)) ([d01dd7c](https://github.com/SHAMAN-KATHMANDU/ims/commit/d01dd7c9ca783611d7cfaf07ed75194218fcac23))
* **orders:** website order model + backend modules for guest checkout (E.1) ([#363](https://github.com/SHAMAN-KATHMANDU/ims/issues/363)) ([76fd5de](https://github.com/SHAMAN-KATHMANDU/ims/commit/76fd5def22197de66633917d7584620d0a7f1b4f))
* **pages:** tenant custom pages, drop tier enum (Phase C.1) ([#355](https://github.com/SHAMAN-KATHMANDU/ims/issues/355)) ([70b672b](https://github.com/SHAMAN-KATHMANDU/ims/commit/70b672b8812e3f1966d56e6bc4172e4478ca3b50))
* **sites:** multi-tenant websites — domains, templates, editor, public API ([#348](https://github.com/SHAMAN-KATHMANDU/ims/issues/348)) ([133dd23](https://github.com/SHAMAN-KATHMANDU/ims/commit/133dd23ce283d311732d802dbbafa9d00bcde428))
* **templates:** 10 new bespoke layouts + section primitives (Phase C.4) ([#359](https://github.com/SHAMAN-KATHMANDU/ims/issues/359)) ([bbd182c](https://github.com/SHAMAN-KATHMANDU/ims/commit/bbd182cffa8dee4db6fe46d5bce5c6457ac5c00e))
* **templates:** per-template theme tokens + Build Your Own + visual polish ([#381](https://github.com/SHAMAN-KATHMANDU/ims/issues/381)) ([1d41487](https://github.com/SHAMAN-KATHMANDU/ims/commit/1d414874ac3bf315d624499e959dc192a418c53c))
* **templates:** per-template themes + Build Your Own + checkout fix ([#382](https://github.com/SHAMAN-KATHMANDU/ims/issues/382)) ([9106df7](https://github.com/SHAMAN-KATHMANDU/ims/commit/9106df70f30ef9d6c42ae04192f6a773deb54cc5))
* **templates:** rewrite 4 layouts on tokens + section toggles (Phase C.3) ([#357](https://github.com/SHAMAN-KATHMANDU/ims/issues/357)) ([2c8c342](https://github.com/SHAMAN-KATHMANDU/ims/commit/2c8c3428113e3e735fce5bce8de0cc022bb56255))
* tenant payment methods and CRM feature lock architecture ([#320](https://github.com/SHAMAN-KATHMANDU/ims/issues/320)) ([f9224fb](https://github.com/SHAMAN-KATHMANDU/ims/commit/f9224fb883d9469e27b5d379a82d1d590b56cc6f))
* **tenant-site:** live preview for draft pages + trim template catalog ([a64c3e7](https://github.com/SHAMAN-KATHMANDU/ims/commit/a64c3e7c1cab47b70efe890d92351ae1fa89ed19))
* **tenant-site:** live preview for draft pages + trim template catalog to 10 ([#372](https://github.com/SHAMAN-KATHMANDU/ims/issues/372)) ([a64c3e7](https://github.com/SHAMAN-KATHMANDU/ims/commit/a64c3e7c1cab47b70efe890d92351ae1fa89ed19))
* **tenant-site:** mobile optimization for all template primitives ([#361](https://github.com/SHAMAN-KATHMANDU/ims/issues/361)) ([c39687a](https://github.com/SHAMAN-KATHMANDU/ims/commit/c39687a4518288757b352a43783dcd87066aebb7))
* **tenant-site:** real product photos on templates + cart (F.1) ([#366](https://github.com/SHAMAN-KATHMANDU/ims/issues/366)) ([65d277e](https://github.com/SHAMAN-KATHMANDU/ims/commit/65d277e26f1c4dd6a734e03bf1b13fde8b3f82a4))
* **tenant-websites:** block-based templates + Framer-lite design editor + settings refactor ([#374](https://github.com/SHAMAN-KATHMANDU/ims/issues/374)) ([d29a9a3](https://github.com/SHAMAN-KATHMANDU/ims/commit/d29a9a31bb52a7241b47a8fc98108cbd0e51f72f))
* **tenant-websites:** e-commerce polish — search, product picker, filters, badges ([#380](https://github.com/SHAMAN-KATHMANDU/ims/issues/380)) ([4c70b80](https://github.com/SHAMAN-KATHMANDU/ims/commit/4c70b8096dc96849daeaf23090d7bb68883140c4))
* **tenant-websites:** full-spectrum block customization + page coverage + editor polish ([#379](https://github.com/SHAMAN-KATHMANDU/ims/issues/379)) ([ae08d54](https://github.com/SHAMAN-KATHMANDU/ims/commit/ae08d5426fff1a788e141fec4500fe2976c5620f))
* **tenant-websites:** full-spectrum block customization + page coverage + editor polish ([#379](https://github.com/SHAMAN-KATHMANDU/ims/issues/379)) ([ae08d54](https://github.com/SHAMAN-KATHMANDU/ims/commit/ae08d5426fff1a788e141fec4500fe2976c5620f))
* **tenant-websites:** layer 0 + layer 1 — checkout fix, editor upgrades, theme editor ([#375](https://github.com/SHAMAN-KATHMANDU/ims/issues/375)) ([9cae19d](https://github.com/SHAMAN-KATHMANDU/ims/commit/9cae19da74e2b198d183d7a5df3582077b47a6e8))
* **tenant-websites:** layers 2–3 + all deferred items + critical fixes ([886ff41](https://github.com/SHAMAN-KATHMANDU/ims/commit/886ff41d0c6565c53c2ff0c7fa972abff8e3e145))
* **tenant-websites:** layers 2–3 + deferred items + useCart fix ([#376](https://github.com/SHAMAN-KATHMANDU/ims/issues/376)) ([886ff41](https://github.com/SHAMAN-KATHMANDU/ims/commit/886ff41d0c6565c53c2ff0c7fa972abff8e3e145))
* **theme:** expand brandingToCssVars to full design-token set (Phase C.2) ([#356](https://github.com/SHAMAN-KATHMANDU/ims/issues/356)) ([0e13b82](https://github.com/SHAMAN-KATHMANDU/ims/commit/0e13b8228df746e6741d5bb310f40eff8e032340))
* unified media library + branch synced with main ([#330](https://github.com/SHAMAN-KATHMANDU/ims/issues/330)) ([98f294e](https://github.com/SHAMAN-KATHMANDU/ims/commit/98f294e073ec5390ff50cb7b84abcc25a100997b))
* **web,shared:** drawer UX, media picker, staging env unlock ([#329](https://github.com/SHAMAN-KATHMANDU/ims/issues/329)) ([280d586](https://github.com/SHAMAN-KATHMANDU/ims/commit/280d586b62064a41c84e5ee619526a7d9d74d9d4))
* **web:** automation & workflow UI/UX overhaul ([#340](https://github.com/SHAMAN-KATHMANDU/ims/issues/340)) ([3b5e120](https://github.com/SHAMAN-KATHMANDU/ims/commit/3b5e1205d85f23861c5dca64dca72d1f024ad878))


### Bug Fixes

* **api:** convert-to-sale crash on null discountType ([#378](https://github.com/SHAMAN-KATHMANDU/ims/issues/378)) ([eeadcb7](https://github.com/SHAMAN-KATHMANDU/ims/commit/eeadcb71373956d0ba323076f8cb32024c2c4b74))
* **api:** harden runtime version resolution ([#328](https://github.com/SHAMAN-KATHMANDU/ims/issues/328)) ([072048b](https://github.com/SHAMAN-KATHMANDU/ims/commit/072048b5fafe956df7595c586dedc1f71b0da666))
* **api:** hostnameResolver honors X-Forwarded-Host ([#351](https://github.com/SHAMAN-KATHMANDU/ims/issues/351)) ([806b72b](https://github.com/SHAMAN-KATHMANDU/ims/commit/806b72b1fb8833d61430572d8e0de58e68bea189))
* **api:** mount /public/preview/page before /public so token routes bypass host resolver ([#373](https://github.com/SHAMAN-KATHMANDU/ims/issues/373)) ([ffa5f7b](https://github.com/SHAMAN-KATHMANDU/ims/commit/ffa5f7b4351413b3f0fcff8e10b0452834fd660e))
* **api:** mount /public/preview/page before /public so token-only routes bypass host resolver ([ffa5f7b](https://github.com/SHAMAN-KATHMANDU/ims/commit/ffa5f7b4351413b3f0fcff8e10b0452834fd660e))
* **api:** null guard on discountType in sale item calculation ([eeadcb7](https://github.com/SHAMAN-KATHMANDU/ims/commit/eeadcb71373956d0ba323076f8cb32024c2c4b74))
* **ci:** E2E seed env, Vitest/Vite pin, pnpm overrides for Trivy ([#343](https://github.com/SHAMAN-KATHMANDU/ims/issues/343)) ([8cbc471](https://github.com/SHAMAN-KATHMANDU/ims/commit/8cbc471e64035428115940229f92ce7d4d2432e7))
* **ci:** seed env, vitest vite 6 pin, and pnpm overrides for Trivy ([8cbc471](https://github.com/SHAMAN-KATHMANDU/ims/commit/8cbc471e64035428115940229f92ce7d4d2432e7))
* **crm:** enforce pipeline-derived journey types ([#334](https://github.com/SHAMAN-KATHMANDU/ims/issues/334)) ([5ecc311](https://github.com/SHAMAN-KATHMANDU/ims/commit/5ecc311baf2ebf2ec847835cc30261cd089fedcd))
* **products,crm,promos:** harden totalStock sorting and form UI ([#322](https://github.com/SHAMAN-KATHMANDU/ims/issues/322)) ([3e4cab8](https://github.com/SHAMAN-KATHMANDU/ims/commit/3e4cab8cd060570b13bea8278c7d75e0a01d534f))
* **tenant-site:** crash on blog/pages settings (server-component non-serializable prop) ([#370](https://github.com/SHAMAN-KATHMANDU/ims/issues/370)) ([9e1ac78](https://github.com/SHAMAN-KATHMANDU/ims/commit/9e1ac78c460e087fd9a42b41203f9b4b1fb4f345))
* **tenant-site:** unblock Docker build — gitkeep public/ + drop trustHostHeader ([#350](https://github.com/SHAMAN-KATHMANDU/ims/issues/350)) ([6ef98d4](https://github.com/SHAMAN-KATHMANDU/ims/commit/6ef98d4f2b9fec9237f28df4640a6ccd6bfc62d8))
* v1 implementation of messenger integration ([#248](https://github.com/SHAMAN-KATHMANDU/ims/issues/248)) ([051c056](https://github.com/SHAMAN-KATHMANDU/ims/commit/051c05682f0ebb8e154be913b90841fd16736265))
* **web,deploy:** align staging app env wiring ([#332](https://github.com/SHAMAN-KATHMANDU/ims/issues/332)) ([addf952](https://github.com/SHAMAN-KATHMANDU/ims/commit/addf9528e0c27276b7846c9c6e297e845700d5f4))
* **web:** automation editor infinite render (React [#185](https://github.com/SHAMAN-KATHMANDU/ims/issues/185)) ([#344](https://github.com/SHAMAN-KATHMANDU/ims/issues/344)) ([86f5a64](https://github.com/SHAMAN-KATHMANDU/ims/commit/86f5a64ffad6345214d65cf85f5ea679ca13c021))
* **web:** promo form & CRM tag dialog; feat(products): IMS code and categories ([#318](https://github.com/SHAMAN-KATHMANDU/ims/issues/318)) ([42e1950](https://github.com/SHAMAN-KATHMANDU/ims/commit/42e19504d6e5e837d303c006cf8a59c73a83666f))
* **web:** website orders crash — function prop across server→client boundary ([#377](https://github.com/SHAMAN-KATHMANDU/ims/issues/377)) ([492c33d](https://github.com/SHAMAN-KATHMANDU/ims/commit/492c33d34f1584754268223b70baa94519a26d68))
* workflow_runs FK, migrate deploy UX, automation guides ([7df7c48](https://github.com/SHAMAN-KATHMANDU/ims/commit/7df7c483feecc66041ec366b6a638ca83cd6dd55))
* workflow_runs tenant FK, migrate deploy UX, automation guides ([#337](https://github.com/SHAMAN-KATHMANDU/ims/issues/337)) ([7df7c48](https://github.com/SHAMAN-KATHMANDU/ims/commit/7df7c483feecc66041ec366b6a638ca83cd6dd55))


### Refactors

* **deploy:** split layout into dev/ and prod/ directories ([#316](https://github.com/SHAMAN-KATHMANDU/ims/issues/316)) ([7d6782a](https://github.com/SHAMAN-KATHMANDU/ims/commit/7d6782a503bf1eb5938604f3866c246079b4f1df))
* **products:** product module enhancements ([#312](https://github.com/SHAMAN-KATHMANDU/ims/issues/312)) ([4f2a098](https://github.com/SHAMAN-KATHMANDU/ims/commit/4f2a098c3d5a7118fa2bc55dc8de06baa90ef6c6))


### Documentation

* **readme:** add pnpm broken lockfile recovery steps ([#326](https://github.com/SHAMAN-KATHMANDU/ims/issues/326)) ([b6aa7d0](https://github.com/SHAMAN-KATHMANDU/ims/commit/b6aa7d075e06e6f0353f36d7abccfa8df9de9c73))
* **readme:** add pnpm lockfile recovery note ([b6aa7d0](https://github.com/SHAMAN-KATHMANDU/ims/commit/b6aa7d075e06e6f0353f36d7abccfa8df9de9c73))
* **tenant-websites:** catalog + pages runbook + Phase C recap (C.6) ([#362](https://github.com/SHAMAN-KATHMANDU/ims/issues/362)) ([db306c0](https://github.com/SHAMAN-KATHMANDU/ims/commit/db306c0aca073c4b314e749bde17b6ff69a9683c))
* **tenant-websites:** full post-cutover update — retrospective, E2E recipe, runtime patch ([#352](https://github.com/SHAMAN-KATHMANDU/ims/issues/352)) ([8d64d24](https://github.com/SHAMAN-KATHMANDU/ims/commit/8d64d24f006c99267e6c73c4540377823b206af1))
* **tenant-websites:** phase e + f docs and demo seed (F.3) ([#368](https://github.com/SHAMAN-KATHMANDU/ims/issues/368)) ([62b871e](https://github.com/SHAMAN-KATHMANDU/ims/commit/62b871e88bb3a8a0dfd5128e8281d201fd2a3888))
