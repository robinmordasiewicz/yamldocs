# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1](https://github.com/robinmordasiewicz/yamlforms/compare/v1...v1.2.1) (2026-02-03)

### Bug Fixes

- automate releases on push to main and rename dist output to site ([dc64a8a](https://github.com/robinmordasiewicz/yamlforms/commit/dc64a8a2ec98f3564b0ead5917702ddb6ab3a1d5))

# [1.2.0](https://github.com/robinmordasiewicz/yamlforms/compare/v1...v1.2.0) (2026-02-03)

### Bug Fixes

- add --no-verify to release workflow and add DOCX to docs generation ([7f21611](https://github.com/robinmordasiewicz/yamlforms/commit/7f2161100b5b998983c8f82b310fbb2286a82336))

### Features

- Add DOCX generator support and comprehensive documentation ([c1f3c22](https://github.com/robinmordasiewicz/yamlforms/commit/c1f3c2277da1d2ad226122ca4a527fee18289a34)), closes [#49](https://github.com/robinmordasiewicz/yamlforms/issues/49)
- generate index pages independent of publishing ([ddadaa9](https://github.com/robinmordasiewicz/yamlforms/commit/ddadaa981c5313d69bf553025b2f937e48b2ebad)), closes [#53](https://github.com/robinmordasiewicz/yamlforms/issues/53)

# [1.1.0](https://github.com/robinmordasiewicz/yamlforms/compare/v1...v1.1.0) (2026-02-03)

### Features

- rename project from yamldocs to yamlforms ([c73dcda](https://github.com/robinmordasiewicz/yamlforms/commit/c73dcda7c9ed44e50458124b41114b766b68b8fd))

### BREAKING CHANGES

- Package renamed from yamldocs to yamlforms

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

## [1.0.4](https://github.com/robinmordasiewicz/yamldocs/compare/v1.0.3...v1.0.4) (2026-02-03)

### Bug Fixes

- use force flag for git add in CI workflows ([a7c2152](https://github.com/robinmordasiewicz/yamldocs/commit/a7c2152df3ddc4405fba9e44fa059e822a0598d6))

### Features

- add GitHub Action for yamldocs ([#45](https://github.com/robinmordasiewicz/yamldocs/issues/45)) ([4b0bd5a](https://github.com/robinmordasiewicz/yamldocs/commit/4b0bd5a3dc063ab6d5d46adce096b1a6724b8390))
- add major version tag automation for GitHub Action ([f94f3a9](https://github.com/robinmordasiewicz/yamldocs/commit/f94f3a9f3f0f8b2f1eef6b197a7b2d8d13b97417))

## [1.0.3](https://github.com/robinmordasiewicz/yamldocs/compare/v1.0.2...v1.0.3) (2026-02-03)

### Bug Fixes

- complete release automation in single workflow ([#43](https://github.com/robinmordasiewicz/yamldocs/issues/43)) ([6d2017c](https://github.com/robinmordasiewicz/yamldocs/commit/6d2017c7373796f391006dac183f965c29a074d9))

## [1.0.2](https://github.com/robinmordasiewicz/yamldocs/compare/v1.0.1...v1.0.2) (2026-02-03)

### Bug Fixes

- split release workflow for full automation ([#42](https://github.com/robinmordasiewicz/yamldocs/issues/42)) ([1237124](https://github.com/robinmordasiewicz/yamldocs/commit/12371248fd08361e8390b1964295eed607be57d0))

## 1.0.1 (2026-02-03)

### Bug Fixes

- adjust @types/node to compatible version for Node 20 ([e79d3ad](https://github.com/robinmordasiewicz/yamldocs/commit/e79d3ad4d9e2fd98b13b5cba22a975ea09c60068))
- improve HTML layout and styling consistency ([16205ab](https://github.com/robinmordasiewicz/yamldocs/commit/16205ab1feefcc575f4ddc5185d22dcd08d39627)), closes [#17](https://github.com/robinmordasiewicz/yamldocs/issues/17)

### Features

- add automated release workflow with npm publishing ([#39](https://github.com/robinmordasiewicz/yamldocs/issues/39)) ([7e24a2f](https://github.com/robinmordasiewicz/yamldocs/commit/7e24a2f027978ce32f013ffcbb3708f056976284))
- add DNS services and load balancer assessment schemas ([f91d460](https://github.com/robinmordasiewicz/yamldocs/commit/f91d460242e53fd1821c1c88d9242f27ce095b8c)), closes [#33](https://github.com/robinmordasiewicz/yamldocs/issues/33)
- add field auto-numbering and custom height support ([3ba78ed](https://github.com/robinmordasiewicz/yamldocs/commit/3ba78ed9457cfb6e509e7634cc5224ac65369734)), closes [#2](https://github.com/robinmordasiewicz/yamldocs/issues/2)
- build all schemas and enhance HTML generation ([b346fef](https://github.com/robinmordasiewicz/yamldocs/commit/b346fefba788394ef67eb07948c9c6ac4ea7795d)), closes [#9](https://github.com/robinmordasiewicz/yamldocs/issues/9)
- enable global npm install with proper path resolution ([#38](https://github.com/robinmordasiewicz/yamldocs/issues/38)) ([3412a02](https://github.com/robinmordasiewicz/yamldocs/commit/3412a02d7dae0f216c1c0d64b1ed22bc1916989b))
- implement HTML layout engine with page pagination support ([#26](https://github.com/robinmordasiewicz/yamldocs/issues/26)) ([d00b75f](https://github.com/robinmordasiewicz/yamldocs/commit/d00b75fb2728c270b6aa712275ec0dd8aa248a5b)), closes [#25](https://github.com/robinmordasiewicz/yamldocs/issues/25)
- implement page layout and pt-to-px conversion for HTML generation ([f0720a0](https://github.com/robinmordasiewicz/yamldocs/commit/f0720a0a5b7310e5164d4de1b4c48d0f71cafa1b)), closes [#23](https://github.com/robinmordasiewicz/yamldocs/issues/23)
- improve table width and checkbox alignment consistency ([9e4d762](https://github.com/robinmordasiewicz/yamldocs/commit/9e4d7628487b3813b2d6feb0300f96727463450c)), closes [#21](https://github.com/robinmordasiewicz/yamldocs/issues/21)
- restructure DDoS assessment form with organizational sections ([ed043ef](https://github.com/robinmordasiewicz/yamldocs/commit/ed043ef08af515d771d2d6e682cf515715c57b7a)), closes [#31](https://github.com/robinmordasiewicz/yamldocs/issues/31)
- upgrade dependencies and rename ddos schema ([f3b39bd](https://github.com/robinmordasiewicz/yamldocs/commit/f3b39bdded93f194e7ead273826bd064c81bef9f)), closes [#7](https://github.com/robinmordasiewicz/yamldocs/issues/7)

## [1.0.0] - 2025-02-02

### Added

- Initial release of yamldocs
- Generate fillable PDF forms with AcroForm fields from YAML schemas
- CLI with generate, validate, preview, and init commands
- Multi-format output (PDF, HTML)
- Watch mode for development
- Calculated fields, conditional visibility, validation rules
- Comprehensive test suite

[1.0.0]: https://github.com/robinmordasiewicz/yamldocs/releases/tag/v1.0.0
