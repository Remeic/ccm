# Changelog

## [0.7.0](https://github.com/Remeic/ccm/compare/ccm-v0.6.0...ccm-v0.7.0) (2026-06-01)


### Features

* **cli:** scriptable output, shell completion, and CLI refactor ([#52](https://github.com/Remeic/ccm/issues/52)) ([c84be86](https://github.com/Remeic/ccm/commit/c84be862931e28211ed1c8a43c0ff0edecb68241))

## [0.6.0](https://github.com/Remeic/ccm/compare/ccm-v0.5.1...ccm-v0.6.0) (2026-06-01)


### Features

* **skills:** add `ccm skills` to manage skills per profile ([#49](https://github.com/Remeic/ccm/issues/49)) ([c570997](https://github.com/Remeic/ccm/commit/c570997d3f0d4349850c642085a1879a6c445e25))

## [0.5.1](https://github.com/Remeic/ccm/compare/ccm-v0.5.0...ccm-v0.5.1) (2026-04-10)


### Bug Fixes

* support resume args in ccm use ([6ffe71a](https://github.com/Remeic/ccm/commit/6ffe71a49ea4e8c7d8c50e9b335e92140f6113b6))
* **use:** forward resume args without separator ([bd1c662](https://github.com/Remeic/ccm/commit/bd1c662e85c106399bb4615cdbb71476e371b188))

## [0.5.0](https://github.com/Remeic/ccm/compare/ccm-v0.4.0...ccm-v0.5.0) (2026-04-09)


### Features

* add profile config copy and create --from bootstrap ([2449100](https://github.com/Remeic/ccm/commit/2449100440f628b4f076b5e4939b85bef01d90b3))
* copy profile config and bootstrap create from profile ([25f34f8](https://github.com/Remeic/ccm/commit/25f34f88e90c818eaa0feb8a4624abf0fcc8742d))

## [0.4.0](https://github.com/Remeic/ccm/compare/ccm-v0.3.0...ccm-v0.4.0) (2026-04-08)


### Features

* add compliance notices for profile creation ([#29](https://github.com/Remeic/ccm/issues/29)) ([fa5dfd0](https://github.com/Remeic/ccm/commit/fa5dfd049ff76bf70d3a7148f26c9f24ffa9c201))


### Bug Fixes

* **ci:** publish Stryker dashboard report ([#27](https://github.com/Remeic/ccm/issues/27)) ([9f6e4f4](https://github.com/Remeic/ccm/commit/9f6e4f409b6b52e0f356b8a8b7ad12b038d33a4b))
* **docs:** update mutation testing badge in README ([#25](https://github.com/Remeic/ccm/issues/25)) ([f88c32e](https://github.com/Remeic/ccm/commit/f88c32e6538498c967b91406f065db54b7812d9f))

## [0.3.0](https://github.com/Remeic/ccm/compare/ccm-v0.2.2...ccm-v0.3.0) (2026-04-04)


### Features

* add profile rename command ([#23](https://github.com/Remeic/ccm/issues/23)) ([50335a1](https://github.com/Remeic/ccm/commit/50335a10db475f273d40781d0315cbc15a890085))

## [0.2.2](https://github.com/Remeic/ccm/compare/ccm-v0.2.1...ccm-v0.2.2) (2026-04-03)


### Bug Fixes

* **pkg:** align repository metadata for provenance ([#21](https://github.com/Remeic/ccm/issues/21)) ([fed8771](https://github.com/Remeic/ccm/commit/fed8771654a79070d9e17d93c342a2a482c03602))

## [0.2.1](https://github.com/Remeic/ccm/compare/ccm-v0.2.0...ccm-v0.2.1) (2026-04-03)


### Bug Fixes

* **ci:** publish to npm via trusted publishing ([#19](https://github.com/Remeic/ccm/issues/19)) ([e6d6898](https://github.com/Remeic/ccm/commit/e6d6898772ff718a83508f62cae9bb486278a101))

## [0.2.0](https://github.com/Remeic/ccm/compare/ccm-v0.1.0...ccm-v0.2.0) (2026-04-03)


### Features

* ✨ [GF] Add ccm gif ([cb20951](https://github.com/Remeic/ccm/commit/cb20951941e6fd3d2b8d2f6888d5d5e086a66459))
* ✨ [GF] Add ccm logo ([2f1fdb3](https://github.com/Remeic/ccm/commit/2f1fdb319a1849c826bf341ad2fc4b7cbd3093bd))
* ✨ [GF] add ccm-cli project files ([8202da5](https://github.com/Remeic/ccm/commit/8202da5f7e7096cc70db5d54505cc4150f09bd36))
* 🛡️ [GF] validate browser commands against shell injection ([211ad2d](https://github.com/Remeic/ccm/commit/211ad2d301a61c1831577bbd98780dfb5ba59745))
* add Homebrew release automation ([3e42870](https://github.com/Remeic/ccm/commit/3e42870f279e220633d8e27c7f26ede1a058d758))
* add Homebrew release automation ([2e36d11](https://github.com/Remeic/ccm/commit/2e36d11ab1dae061a15e1a7c75bcd416a60d04e3))


### Bug Fixes

* 🔒 [GF] restrict config file permissions to owner-only (0o600) ([573aff6](https://github.com/Remeic/ccm/commit/573aff6007fee78daad1efdec4538060d607ed51))
* 🔧 [GF] inject version from package.json via tsup define ([9d1d815](https://github.com/Remeic/ccm/commit/9d1d8151b93b268e97282c51c7fe394093c76e04))
* align profile state handling and zod validation ([80b3e79](https://github.com/Remeic/ccm/commit/80b3e79384a9d51969eb4c954c8aa5be74048939))
* **ci:** generate package-lock before npm audit ([07f153c](https://github.com/Remeic/ccm/commit/07f153c073d7cb5c0929176187ca47de8cfa4fc9))
* gate Homebrew workflow with env token ([6c35ba5](https://github.com/Remeic/ccm/commit/6c35ba55651ec74b2930457d73aa344085dd3690))
* gate Homebrew workflow with env token ([c2e271d](https://github.com/Remeic/ccm/commit/c2e271d0990c6beb63582bb727316f065f33d6f6))
* make permission and binary-discovery tests platform-aware for Windows ([123281b](https://github.com/Remeic/ccm/commit/123281b3e5a757538ff4a171b2d3fe7d7b5b6d06))

## Changelog

All notable changes to this project will be documented in this file.

This file is managed by Release Please.
