# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.2.2"></a>
## [1.2.2](https://github.com/arobson/kickerd/compare/v1.2.1...v1.2.2) (2017-07-20)


### Bug Fixes

* correct watch logic and add better logging around watch behavior ([5ac9471](https://github.com/arobson/kickerd/commit/5ac9471))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/arobson/kickerd/compare/v1.2.0...v1.2.1) (2017-07-12)


### Bug Fixes

* remove dependence on old approach to default values in environment map for process host ([4736f9f](https://github.com/arobson/kickerd/commit/4736f9f))
* set environment equal to '' rather than string 'undefined'; tighten up numeric regex ([6f2b520](https://github.com/arobson/kickerd/commit/6f2b520))
* tighten up number regex ([#2](https://github.com/arobson/kickerd/issues/2)) ([706c478](https://github.com/arobson/kickerd/commit/706c478))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/arobson/kickerd/compare/v1.1.0...v1.2.0) (2017-07-11)


### Bug Fixes

* didn't quite nail edge-cases ([cc70ed8](https://github.com/arobson/kickerd/commit/cc70ed8))


### Features

* allow for application level config, which overrides global config ([7513121](https://github.com/arobson/kickerd/commit/7513121))
* change watch implementation so that value will have the desired outcome based on specificity and ignore changes from lower levels ([46baf96](https://github.com/arobson/kickerd/commit/46baf96))
* improve configuration data structure for easier management of value precedent ([96946cb](https://github.com/arobson/kickerd/commit/96946cb))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/arobson/kickerd/compare/v1.0.0...v1.1.0) (2017-07-07)


### Features

* add support for arguments ([890176b](https://github.com/arobson/kickerd/commit/890176b))
