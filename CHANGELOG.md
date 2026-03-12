## [1.14.1](https://github.com/igor-siergiej/jewellery-catalogue/compare/v1.14.0...v1.14.1) (2026-03-12)


### Bug Fixes

* remove duplicate workflow files ([c38c316](https://github.com/igor-siergiej/jewellery-catalogue/commit/c38c3168b2f47fc7dabc8c34f21795c19fe334f4))
* use GitHub Container Registry (ghcr.io) instead of Docker Hub ([e189dce](https://github.com/igor-siergiej/jewellery-catalogue/commit/e189dcec18b57da3767d78fc2ae2e20063a40484))

# [1.14.0](https://github.com/igor-siergiej/jewellery-catalogue/compare/v1.13.0...v1.14.0) (2026-03-12)


### Bug Fixes

* add mime.types include to nginx config for correct MIME type serving ([d0d0c69](https://github.com/igor-siergiej/jewellery-catalogue/commit/d0d0c69eb1af89ba6efecdb2389fdca369ef7da3))
* **ci-cd:** add contents:read permission for checkout action ([2040d40](https://github.com/igor-siergiej/jewellery-catalogue/commit/2040d40776ad922633f02ae96b20dd630824a0bf))
* **ci-cd:** correct version extraction for GitHub Actions ([312801d](https://github.com/igor-siergiej/jewellery-catalogue/commit/312801d2609b6a155d8af1ba8655e90f4e26ac5f))
* **ci-cd:** use GITHUB_TOKEN instead of GH_TOKEN ([9652c49](https://github.com/igor-siergiej/jewellery-catalogue/commit/9652c4984956b252938f8aa41de36dc86c35d5e0))
* correct Docker build output paths for web (build) and api (build) ([2bcdbbd](https://github.com/igor-siergiej/jewellery-catalogue/commit/2bcdbbdb09b096e175bf4998d7ca6b7e4a315fbc))
* correct materials population and low stock threshold logic ([8c183a1](https://github.com/igor-siergiej/jewellery-catalogue/commit/8c183a18f94d2538c03f5f7bbb823ad93f7731a4))
* correct repository URL to igor-siergiej org ([5cd50ff](https://github.com/igor-siergiej/jewellery-catalogue/commit/5cd50ffdc9c521814f912f2831cd01c9b71ab9d7))
* correct reusable workflow org reference ([27aaa98](https://github.com/igor-siergiej/jewellery-catalogue/commit/27aaa989aaff4ad2ed6be90415a42a76f54bc685))
* enable lowStockThreshold to be saved on design create/edit ([9c1dc3f](https://github.com/igor-siergiej/jewellery-catalogue/commit/9c1dc3f0b5cd78f81a7a895e836fc9c1e2884499))
* format numeric values in materials tables to prevent floating-point precision display ([5b111b0](https://github.com/igor-siergiej/jewellery-catalogue/commit/5b111b062e16bcdefbfcc9bdd8dc4517d8f6a40f))
* make NODE_AUTH_TOKEN optional in yarn config ([4519df0](https://github.com/igor-siergiej/jewellery-catalogue/commit/4519df050e18a65dff010fd20f92afeba1914089))
* Update Docker registry IP from 192.168.68.59 to 192.168.68.54 ([12307bf](https://github.com/igor-siergiej/jewellery-catalogue/commit/12307bf76a234abd9b91ed76d1f09cfe00b1fb2f))


### Features

* add separate Dockerfiles for API and web services ([5b99382](https://github.com/igor-siergiej/jewellery-catalogue/commit/5b99382b2902bfe093aa81a2b51fcec3e84f2828))
* add utils submodule for shared CI/CD pipelines ([d7b1118](https://github.com/igor-siergiej/jewellery-catalogue/commit/d7b111832ccd8942c76ece75233dbdc92b439d42))
* **ci-cd:** add GitHub Actions workflow with shared pipelines ([e86a0c5](https://github.com/igor-siergiej/jewellery-catalogue/commit/e86a0c55187043011bceb465374e3ff8f70f4ed5))
* improve design buttons UX, add sticky layout, and richer materials table ([0702ddd](https://github.com/igor-siergiej/jewellery-catalogue/commit/0702ddda4b676aee6bf73dae9fe23cd9de999da5))

# [1.13.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.12.1...v1.13.0) (2026-01-31)


### Features

* enhance AddMaterialsTable with material type and attribute badges ([3478705](https://gitlab.com/imapps/jewellery-catalogue/commit/3478705f9c8e2aef248da7a4606f63f6cad3e1e8))

## [1.12.1](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.12.0...v1.12.1) (2026-01-31)


### Bug Fixes

* enable materialCode field to be saved to database ([726584f](https://gitlab.com/imapps/jewellery-catalogue/commit/726584f774fe21d7ec581c02277548620b0656ab))

# [1.12.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.11.0...v1.12.0) (2026-01-31)


### Bug Fixes

* prevent Enter key from submitting form on input fields ([a2bb51f](https://gitlab.com/imapps/jewellery-catalogue/commit/a2bb51f86961947b06b4269d12bf42ed0dc1de81))
* remove FormDescription import from TimeInput ([3a60e83](https://gitlab.com/imapps/jewellery-catalogue/commit/3a60e831ed181f56237018d61a8b376cc59f2e0c))


### Features

* enhance TimeInput with keyboard-friendly UX and hidden calendar picker ([0330f9e](https://gitlab.com/imapps/jewellery-catalogue/commit/0330f9e3b60e9ef6be79276dd61e5315a6bca729))

# [1.11.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.10.2...v1.11.0) (2026-01-30)


### Bug Fixes

* improve theme font clarity and readability ([b2aaa08](https://gitlab.com/imapps/jewellery-catalogue/commit/b2aaa08c7379a56514aa0917ed1701f49408534b))


### Features

* add vite-node to api package and create vite config ([390aa28](https://gitlab.com/imapps/jewellery-catalogue/commit/390aa28ee113256877e7008a90c95877e81ebded))

## [1.10.2](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.10.1...v1.10.2) (2026-01-28)


### Bug Fixes

* update Dockerfile to install runtime dependencies ([0274bf7](https://gitlab.com/imapps/jewellery-catalogue/commit/0274bf799cfefee38b604ef923f9647cd37621c1))

## [1.10.1](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.10.0...v1.10.1) (2026-01-28)


### Bug Fixes

* remove koa-body from bundled dependencies ([bc33106](https://gitlab.com/imapps/jewellery-catalogue/commit/bc331067177d1574e2e789985aae8e40151ee462))

# [1.10.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.9.0...v1.10.0) (2026-01-27)


### Bug Fixes

* adding materials in add desing not working ([6bf287f](https://gitlab.com/imapps/jewellery-catalogue/commit/6bf287f27bd107965b91c616a35115a65d05b1af))
* **ci/cd:** match shoppingo docker configuration for build jobs ([c25c3fa](https://gitlab.com/imapps/jewellery-catalogue/commit/c25c3fa02449028c9076dc12c679857168e954f8))
* linting ([0228ca7](https://gitlab.com/imapps/jewellery-catalogue/commit/0228ca7a08de2211027e4fcc4502248e799e9442))


### Features

* added quantity in stock in design card ([a737956](https://gitlab.com/imapps/jewellery-catalogue/commit/a73795652d23a80d5acdbc671a4e0be735bdb44f))

# [1.9.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.8.1...v1.9.0) (2025-10-17)


### Features

* add edit design and create design modals ([481aa6f](https://gitlab.com/imapps/jewellery-catalogue/commit/481aa6f6b88e87bf04e0735ecfac001bec207e10))

## [1.8.1](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.8.0...v1.8.1) (2025-10-13)


### Bug Fixes

* image version in build ([92b86bc](https://gitlab.com/imapps/jewellery-catalogue/commit/92b86bc3ea1c94c794a7b47a069e17d772152f99))

# [1.8.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.7.0...v1.8.0) (2025-10-12)


### Features

* add inventory attributes to materials and edit material form ([3088087](https://gitlab.com/imapps/jewellery-catalogue/commit/308808711a961dd56ed8068fad328071c3ca587b))

# [1.7.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.6.0...v1.7.0) (2025-10-12)


### Features

* consolidate schema and types and add design bugs ([90f2ace](https://gitlab.com/imapps/jewellery-catalogue/commit/90f2ace9a951f7432ba55bcf45c53b6bd170f77c))

# [1.6.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.5.0...v1.6.0) (2025-10-10)


### Bug Fixes

* improve tag cleanup to handle remote orphaned tags ([455586d](https://gitlab.com/imapps/jewellery-catalogue/commit/455586dcda3c83fe11b6147fafec4005575b516b))
* linting ([08db765](https://gitlab.com/imapps/jewellery-catalogue/commit/08db7658125d2919925fd5e97a608250c9efb3a0))
* wait for build before versioning ([03cc015](https://gitlab.com/imapps/jewellery-catalogue/commit/03cc015eb0e65a309c932b085e566c3de2105ebc))


### Features

* add dateAdded field to Design and Material types ([cfef386](https://gitlab.com/imapps/jewellery-catalogue/commit/cfef3864b6f6368032fdcd77f7c7abd791d84e59))
* dry up schema and types ([37b19c1](https://gitlab.com/imapps/jewellery-catalogue/commit/37b19c11a02b15a58f957b08fed6c5675acc203e))
* remove catalogues, add design page ([d800c7e](https://gitlab.com/imapps/jewellery-catalogue/commit/d800c7ec10f9babb06a1a7bfa67d2b4d0e8efc60))
* use biome-config package ([8aad0d7](https://gitlab.com/imapps/jewellery-catalogue/commit/8aad0d7957685cc572832bfc2dd94480d7b0e0bc))
* use build step pipeline ([c0edd14](https://gitlab.com/imapps/jewellery-catalogue/commit/c0edd14f8f8470efc2a04016ad3cc8f6b38ea152))

# [1.6.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.5.0...v1.6.0) (2025-10-10)


### Bug Fixes

* linting ([08db765](https://gitlab.com/imapps/jewellery-catalogue/commit/08db7658125d2919925fd5e97a608250c9efb3a0))
* wait for build before versioning ([03cc015](https://gitlab.com/imapps/jewellery-catalogue/commit/03cc015eb0e65a309c932b085e566c3de2105ebc))


### Features

* add dateAdded field to Design and Material types ([cfef386](https://gitlab.com/imapps/jewellery-catalogue/commit/cfef3864b6f6368032fdcd77f7c7abd791d84e59))
* dry up schema and types ([37b19c1](https://gitlab.com/imapps/jewellery-catalogue/commit/37b19c11a02b15a58f957b08fed6c5675acc203e))
* remove catalogues, add design page ([d800c7e](https://gitlab.com/imapps/jewellery-catalogue/commit/d800c7ec10f9babb06a1a7bfa67d2b4d0e8efc60))
* use biome-config package ([8aad0d7](https://gitlab.com/imapps/jewellery-catalogue/commit/8aad0d7957685cc572832bfc2dd94480d7b0e0bc))
* use build step pipeline ([c0edd14](https://gitlab.com/imapps/jewellery-catalogue/commit/c0edd14f8f8470efc2a04016ad3cc8f6b38ea152))

# [1.5.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.4.0...v1.5.0) (2025-10-05)


### Features

* reworked add design form ([362fe6c](https://gitlab.com/imapps/jewellery-catalogue/commit/362fe6ccb703977a5a9974ae51dcd2f7daeb04dd))

# [1.4.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.3.0...v1.4.0) (2025-10-05)


### Features

* reworked add design page ([dabd3a3](https://gitlab.com/imapps/jewellery-catalogue/commit/dabd3a352d06b5ed7a8c6972fa98f7b133681bbc))

# [1.3.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.2.1...v1.3.0) (2025-10-05)


### Features

* add table for each material type ([6901a3f](https://gitlab.com/imapps/jewellery-catalogue/commit/6901a3f96843e3a746d722f040ce34b64eebc5c9))
* rework add material form ([013c10a](https://gitlab.com/imapps/jewellery-catalogue/commit/013c10a1db15a7aa501b07138119f24872dac90c))

## [1.2.1](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.2.0...v1.2.1) (2025-10-05)


### Bug Fixes

* add hook form resolver ([6d9a8ae](https://gitlab.com/imapps/jewellery-catalogue/commit/6d9a8ae9114297f6e8935bf6602169081db64f98))

# [1.2.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.1.1...v1.2.0) (2025-10-05)


### Features

* use zod for login/register form ([c88c649](https://gitlab.com/imapps/jewellery-catalogue/commit/c88c649d6235d698422085413931ce9d8c3a08b3))

## [1.1.1](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.1.0...v1.1.1) (2025-10-04)


### Bug Fixes

* remove price and material costs from design card ([faa4ffd](https://gitlab.com/imapps/jewellery-catalogue/commit/faa4ffd956e85fe93b0345ac014a4c06270d10ff))

# [1.1.0](https://gitlab.com/imapps/jewellery-catalogue/compare/v1.0.1...v1.1.0) (2025-10-04)


### Features

* added empty components ([60902a8](https://gitlab.com/imapps/jewellery-catalogue/commit/60902a82d45908c8f799a188b5a36df4af129762))

# 1.0.0 (2025-10-04)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))
* trigger release after removing tag ([90fb12e](https://gitlab.com/imapps/jewellery-catalogue/commit/90fb12e82654666ba4d9d62260b058682213969c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-04)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))
* trigger release after removing tag ([90fb12e](https://gitlab.com/imapps/jewellery-catalogue/commit/90fb12e82654666ba4d9d62260b058682213969c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-04)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))
* trigger release after removing tag ([90fb12e](https://gitlab.com/imapps/jewellery-catalogue/commit/90fb12e82654666ba4d9d62260b058682213969c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))
* trigger release after removing tag ([90fb12e](https://gitlab.com/imapps/jewellery-catalogue/commit/90fb12e82654666ba4d9d62260b058682213969c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))
* remove github pipeline and add bumping package versions ([88a7b9e](https://gitlab.com/imapps/jewellery-catalogue/commit/88a7b9ea7c0f29d80eaef20753bcc368e2dfbb61))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))

# 1.0.0 (2025-10-03)


### Bug Fixes

* gitlab compatible docker files ([00de5a0](https://gitlab.com/imapps/jewellery-catalogue/commit/00de5a0ed3daa1dab6512e35439f82b6f89f8f5c))


### Features

* move to gitlab ([57d3e4b](https://gitlab.com/imapps/jewellery-catalogue/commit/57d3e4bb48b25404458c0e545677ad7b8e3d2622))
* move to gitlab ([6c2bf15](https://gitlab.com/imapps/jewellery-catalogue/commit/6c2bf15a8a32d42a5f2077654e5e2060d3b7f63e))
* remove web unit tests ([23f5d50](https://gitlab.com/imapps/jewellery-catalogue/commit/23f5d508dae1674aabd62a28dfb156db074d6483))
