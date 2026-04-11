# Changelog

## [1.6.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.5.0...v1.6.0) (2026-04-03)


### Features

* implement custom Titlebar component with integrated CognodeLogo and navigation controls ([d80bec1](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d80bec1041062de70e8513338661ad695be4f537))
* Synthesis Observability Parity ([#42](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/42)) ([6460600](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/64606001190b1747b4b575d5601e2f7d762bdbf3))
* **synthesis:** Implement Multi-Session Log History System ([#43](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/43)) ([ca5c50a](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/ca5c50ad9122cd583c46f55dd923dae27c8d9307))
* **theme:** implement high-fidelity dark mode toggle with ripple animation ([#29](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/29)) ([b9e915e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/b9e915e5c8e92c19aa0f0432e07d05eb279b4378))
* **ui:** implement adaptive theme across dashboard ([#30](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/30)) ([0a4e288](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0a4e288c5f284f8881b1e8d7368230c7548f6021))
* **ui:** Unify node hover effects ([#38](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/38)) ([2d4247e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/2d4247e3e4e2b9a6ff2e2e7fb77e46c45a177233))
* **web:** premium dashboard redesign and cursor refinement ([#27](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/27)) ([4814816](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4814816fdd819d89dd9a59ae2bc79b41b0a5a41f))
* **web:** premium ink-and-paper redesign with elite motion UI ([#23](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/23)) ([54371e4](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/54371e4d3fb0a11f8a6100dddbfe91c6773ad147))
* **web:** update Cognode branding with new SVG logo and standardized components ([9c58307](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/9c58307119056532d0b573d292ce6472b6e480fa))


### Bug Fixes

* **api:** handle empty source_urls avoiding KeyError during synthesis streaming ([#39](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/39)) ([c011043](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/c0110438c1845399fe9576f07b6739f21cef6687))
* **api:** resolve synthesis crashes and improve writer agent adherence ([#40](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/40)) ([b6d78f7](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/b6d78f7dee64deaa17a5a2daa408df9acce887f3))
* **backend:** add desktop app://- protocol to allowed CORS origins for oauth exchange ([#18](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/18)) ([d4b81dd](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d4b81dd6f01fc68c856592e489e6c75c772c2f11))
* **frontend:** use absolute https url for react-pdf worker to prevent app:// protocol resolution errors ([#19](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/19)) ([e308ac1](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e308ac16a56f4d23d1eb2b76f49adcd694fe680b))
* **web:** restore ink-and-paper light theme and stabilize typography ([#24](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/24)) ([44c92d8](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/44c92d8775b47b365263579404cef179c95349a0))

## [1.5.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.4.0...v1.5.0) (2026-03-13)


### Features

* **settings:** add about tab with app info, links, and credits ([#15](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/15)) ([d1da44b](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d1da44b1d51d28a7692ea0e821ea939fda02c110))


### Bug Fixes

* **desktop:** implement custom app:// protocol to resolve Next.js subset static assets correctly on nested routes ([#17](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/17)) ([18bbf3b](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/18bbf3bb31602c9e8e33ef91dcc1c9631e834a8d))

## [1.4.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.3.0...v1.4.0) (2026-03-12)


### Features

* **frontend:** resolve lint warnings and migrate to Tailwind 4 ([#13](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/13)) ([501c95d](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/501c95d71b25f3a2bae05e320995a3b2e465583d))

## [1.3.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.2.0...v1.3.0) (2026-03-12)


### Features

* **frontend:** resolve lint warnings and migrate to tailwind 4 ([#11](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/11)) ([c28e5b0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/c28e5b0450c8217a7dc5bfddd877190810532184))

## [1.2.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.1.0...v1.2.0) (2026-03-10)


### Features

* **desktop:** implement production grade update engine ([#7](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/7)) ([79f1d80](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/79f1d80945c87ba32d08f6b329979aa5db502fcb))

## [1.1.0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/compare/v1.0.0...v1.1.0) (2026-03-10)


### Features

* **ci:** add automated desktop build and release pipeline for windows ([#5](https://github.com/zakaur-rahman/Rabbit-Hole-OS/issues/5)) ([fb64b30](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/fb64b30d858415d3984e29f106a46f5dbe4a05c0))

## 1.0.0 (2026-03-10)


### Features

* Add `package.json` to initialize the desktop application with Electron build configurations and development dependencies. ([d5fc6d7](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d5fc6d76e98ac1040d7ac26285e5a6eda616d5c6))
* Add backend API and frontend client for managing graph edges on whiteboards. ([5bfe79c](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/5bfe79c7c077bf699085f3a59770faf67fa76494))
* add billing page with subscription management, payment history, and plan details, along with a new modal component. ([39e63e9](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/39e63e995529b8629832d6d6ff5a90f4764480c2))
* add core dashboard pages for overview, projects, and billing. ([cec7a0d](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/cec7a0d6811b532c4768d481bbb68e4bd73dee43))
* add desktop installer branding (logo) and EULA License step ([8a56618](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8a56618acda16bce5b0131dbcd70224fb721a2e1))
* add Dockerfile for the web application with a multi-stage build and production-ready configuration. ([6d326eb](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/6d326ebe988af2b0557d67cd591c61fcd0f15e49))
* Add Dockerfile for the web application with a multi-stage build process. ([a78f3d6](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/a78f3d6d9e54c047989f4a48fd459c9837de19fa))
* Add Dockerfile for the web application, implementing a multi-stage build with a non-root user and health check. ([9e284fe](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/9e284fe3b68f497332ad931d3e61713f39b9fdb6))
* Add Dockerfiles for the backend Python application and the web Next.js application. ([d6a1d7c](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d6a1d7c48a1b172475583431cb1405f8bd8b72e7))
* Add GitHub Actions workflow for building and releasing the application across Windows and macOS. ([7f4ad73](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/7f4ad73f3b9035b770b84cb7099e567179d8f4e2))
* Add GitHub Actions workflow for building and releasing the application across Windows and macOS. ([383b4ea](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/383b4ea4eb5d4b9d264b8975e067f75be1cdf100))
* add GitHub Actions workflow to trigger Render deployments for web and backend services ([c615046](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/c61504651d895922b46ae126a2d69d7961926814))
* Add GitHub Actions workflows for desktop distribution builds and Render deployments, and configure the backend service for Render. ([111c109](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/111c109b7b339f64a683206c96520cad348ed4be))
* Add LLM service with multi-provider support for generating synthesis, research reports, and document ASTs. ([8a8ad44](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8a8ad44cb18784bb26a7babf28ca4b4fa1fb3921))
* Add new frontend application with a CanvasView and a PdfNode component for displaying PDF documents. ([58ac440](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/58ac4408830c2643c37b4cdbe6be4092f981aee2))
* Add new frontend application with its initial package dependencies. ([43bfc74](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/43bfc74d7eb2005a99abfd2ae87843e742ad1429))
* Add new frontend application with its package dependencies. ([3b1991f](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/3b1991f7a565bc57236456577f73ac9ba5cfdfc3))
* add Next.js environment type declarations file `next-env.d.ts` ([81d4ade](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/81d4adea4577b36bbc80788a3f7ea680fb7ef435))
* Add OAuth authentication, initial graph storage, and a new CommentNode. ([dc0ce82](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/dc0ce827a969a7b4f7da1af4191319c6af947111))
* Add Render deployment configuration, backend Dockerfile, and GitHub Actions workflow for continuous deployment. ([e693bf4](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e693bf494b0e430e72810d7ac03441d50a262d20))
* Add storage files ([e9e7b55](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e9e7b552ee6f1842d0c4306705bda81129f9529c))
* Add Tiptap editor and NoteNode components, and initialize new frontend and desktop applications. ([4ad1ebc](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4ad1ebc0b88ea38ad09405d0a99da2a4895602ba))
* add Tiptap rich text editor component with various formatting options and initial canvas node types. ([aeda150](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/aeda1508fefc90a9cf7283630a62166f21a3d81c))
* Added node tab sync feature ([50de79f](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/50de79faba5e349b35665597af9f3e28df9733cc))
* Configure Render deployment for the web app, including custom domains and DNS setup documentation. ([385bded](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/385bdedc9733d1c23b404ab732cf05e181358b41))
* deps: Add baseline-browser-mapping to devDependencies. ([bef1a03](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/bef1a0319b52132299d2b61f6cb2223e8ff748e4))
* Establish comprehensive CI/CD infrastructure with GitHub Actions workflows for build, test, security, Docker, preview, and release, alongside a detailed walkthrough. ([1d1673e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1d1673e44483f8f6fe0e25542d813d121176e46b))
* Establish foundational backend and web services with Dockerization and Render deployment infrastructure. ([10f6dd4](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/10f6dd4ad47e0c22936bee4b31cbf383ef3b8770))
* Establish initial application framework including Google OAuth authentication, core graph data management, and desktop client support. ([2280571](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/22805714f92e8f4741532e4f7a302a597cc5d9a4))
* Establish initial backend application structure with core APIs, services, and OAuth authentication. ([c21636f](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/c21636f05ea157774c5393f811bac7dfb0e7aa65))
* Implement a browser view with tab management and automatic graph node creation for visited URLs. ([1a5c6c2](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1a5c6c2b22700eb5f5e151d6fc02da734076249e))
* Implement a comprehensive research synthesis engine with job orchestration, caching, versioning, and PDF generation capabilities, along with frontend integration and verification. ([32deef5](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/32deef5710d4bd3595c4158eb6168d68702fa27f))
* Implement a comprehensive research synthesis system with a new orchestrator, asynchronous workers, data models, API endpoints, and dedicated frontend components. ([071ee91](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/071ee9120d23d7e8c5f917c158983ae5bc0aa028))
* Implement a new authentication system (v2) across web, desktop, and backend, alongside new dashboard features and API endpoints. ([a015d44](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/a015d44289db055d0a97c751ac2dc8f6cdd44312))
* implement a new Header component with search, navigation, and Electron-aware authentication. ([aa04bcd](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/aa04bcd0d0fa08a2eecfd49a2ec7fc992851f93c))
* Implement agent-driven research synthesis with PDF generation, job management, and comprehensive deployment documentation. ([80d6bb3](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/80d6bb3d85e924b13a56b581fa12bce169363692))
* Implement AI synthesis, edge labeling, node search, and PDF research report generation with new canvas nodes and modals. ([67fe5de](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/67fe5def4e98cda7361a69aafc2f99756ac55cd5))
* Implement AI-powered URL analysis and outline generation with new backend services and a canvas-based frontend for node visualization. ([32a727b](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/32a727b83069adf10b5691de17d3851c3f24ce09))
* Implement backend application for research synthesis with job processing, worker, agents, and API endpoints. ([db25ac0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/db25ac0a5ba97578fad83d2dae91ba4fbd0a26ee))
* Implement browser view with tab management, webview integration, and auto-sync to graph store. ([1285d2a](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1285d2a163d24145b0e4484711bd274ce98aa9e8))
* implement BrowserView component with webview, navigation controls, and auto-sync functionality to create graph nodes from visited URLs. ([d11f2d4](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d11f2d4c116526a784e2b27da9f1b814acd0c17e))
* implement CI/CD pipeline for multi-platform desktop application builds and releases using GitHub Actions. ([21589ba](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/21589bace9cc2e5897785be163b81e6af9228496))
* Implement comprehensive authentication system with Google OAuth, PKCE, JWT, and session management across frontend, backend, and desktop. ([0f08f4e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0f08f4e18a76f346d838468244df25ae103b899b))
* Implement core canvas view with various node types, graph controls, and a canvas import modal. ([ea94cef](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/ea94cefe77fd7a4d0d73a5d4a270c4335103f9ee))
* Implement core canvas workspace including file tree, node components, UI elements, and initial Electron application setup. ([d5f70c8](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d5f70c8c9e1ef3f23bbda66c3179bba19ec89495))
* Implement core frontend UI components, backend API routes, and schema definitions. ([de0ea4e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/de0ea4e4010780b41360ddf83a2efa0db166b178))
* Implement core graph functionality with backend node/edge schemas, frontend API, graph store, and initial canvas/browser UI. ([2a455e9](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/2a455e9161e792aa7488b4033f8730a083cd7df6))
* Implement core graph, whiteboard, and browser state management using Zustand, including Electron persistence. ([498117b](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/498117babad6466c5e61a2d1b9e394c66579bde1))
* Implement document AST editing, synthesis, and research PDF functionalities with new frontend components and backend services. ([d5ffd6e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d5ffd6eac4ab5cf029680a4bf86b3740d30c0aa4))
* Implement document synthesis feature with structured AST schema, worker, and API endpoints. ([395b79e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/395b79ef62f090539c172b57b4632b951de74fd1))
* Implement end-to-end research synthesis pipeline with job management, document generation, and related UI components. ([b530198](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/b530198a65afe9610dff5d2103af5b331da88277))
* Implement initial canvas node types including TextNode, BaseNode, GroupNode, and their associated NodeActionsToolbar and data storage. ([8877076](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8877076d095654d77d01432f0058b75412bdaf31))
* implement initial canvas view with overlay, connection drop menu, and custom hooks for interactions. ([78345f2](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/78345f293319caa1531a2575eaff4bbd31df19d9))
* Implement initial user dashboard with authentication, navigation, and core management sections. ([0a44740](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0a44740157016f386c28ee795855a33cde96d3b7))
* Implement initial web application structure including landing page, dashboard, and subscription management. ([934ae45](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/934ae458393e633e17bb23840f31f5672566a916))
* Implement interactive canvas with diverse node types including image and PDF support. ([64a4e5b](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/64a4e5ba0152896ce6fe543419d6da67c4490960))
* Implement multi-agent research synthesis backend with API, worker, core services, and architectural documentation. ([bda0402](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/bda0402bf1c5d083e47dace621168e78074ac2e0))
* Implement OAuth 2.0 authentication with PKCE, user, and session management across frontend, backend, and Electron applications. ([e20288e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e20288e701d937d6760b8203c14c560d48b7b509))
* Implement OAuth authentication system with Google integration, session management, and supporting frontend UI. ([fa5afca](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/fa5afca42df90aa5e6e6aa40eefd67251361140a))
* Implement Profile and Sessions modals, redirecting old dedicated pages to a central settings view. ([1fddce8](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1fddce8ce22e7d13215c82ccf311fa7d01dd6e20))
* Implement rich text NoteNode for canvas with Tiptap editor, BaseNode, and global styling. ([04cc6d0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/04cc6d0550244f8d7835040214ef09c844eeaced))
* Implement the core frontend application, including canvas, diverse node types, modals, and Electron-specific local storage. ([be5653d](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/be5653deeae620dd02ef4e01a5c62f10d890ae99))
* Implement web scraping and content extraction services, introduce new backend services for agents, chunking, and document AST, and add a frontend API client. ([1b34ba4](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1b34ba400c45822d4e145839fedf10b4f321f078))
* Implement whiteboard management, a comprehensive graph API, and Electron desktop integration with local storage. ([0ba77ce](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0ba77cefeaf2774423637797c548cbde0158067a))
* initialize backend graph storage with `edges.json` and `nodes.json` and add `CommentNode` to the frontend. ([a68f809](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/a68f809a4b9e700af3dcc8c8efb75b1abfe4fd8d))
* Initialize the Electron desktop application with backend process, local storage, sync service, and frontend browser view components. ([7395dea](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/7395dea6a31993981341d61c8c74ae64a66e3b15))
* install tectonic ([9876c1f](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/9876c1f7382fb820b5b987c8d7e31f97e16ff75d))
* Introduce a new graph store to manage nodes, edges, whiteboards, and browser tabs, alongside a canvas view and interaction hooks. ([e492d63](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e492d6340d9a64c6a09691e6a86d609fd79eb7bd))
* Introduce AI-powered document synthesis, a comprehensive AST editor, and expanded canvas controls. ([f3ecba6](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/f3ecba67b20563b1e707689b3be6a19edf459825))
* Introduce an integrated browser with automatic graph node creation, canvas visualization, and comprehensive state management. ([4a769ff](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4a769ffd827a11f517fa0f94ffb4b4de7ef2b38a))
* Introduce browser view with auto-node creation for visited URLs and backend outline processing. ([64f9a68](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/64f9a685cbd4b6339c24b5bfa580f0e2ae4e1994))
* Introduce browser view with smart URL resolution and automatic graph node creation, utilizing extracted browser utilities and a new tab page. ([39d9c59](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/39d9c596158f9a58bb7e703db00419784bfbf9af))
* Introduce BrowserView component for web browsing with tab support, automatic graph node generation, and link interception. ([804081a](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/804081a1d0ffa6f645e3729935842227973b62ba))
* Introduce comprehensive research synthesis feature with AI agentic workflows, including frontend modals, backend services, and verification scripts. ([91a81b9](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/91a81b912316a077bf07c3b35729f701b5a78af8))
* introduce core application settings for database, AI, OAuth, JWT, and Redis using pydantic_settings. ([53c5489](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/53c5489c1625c8311a9278345651f81171d88403))
* Introduce core authentication, whiteboard management, and browser view functionality. ([57200eb](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/57200eba9cceb1ff288bad0782c1edb05363ea55))
* Introduce diverse canvas node types for text, articles, and various content, supported by a new web scraper and browser view. ([fb95827](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/fb95827186b4436fe1cef1671d6f79b805d11b49))
* Introduce Docker-based deployment for web and backend services and establish CI/CD for multi-platform desktop application builds. ([bbf2ff1](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/bbf2ff1aee3bab88116f8da18bd1e23e04dcc227))
* Introduce graph and whiteboard features with Zustand store, API persistence, and browser state management. ([9a577a3](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/9a577a35c70f98494b64740b16a34eee69e89154))
* Introduce graph canvas view with Zustand store for nodes, edges, and whiteboards. ([4e99f0d](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4e99f0d9305d3fe77bc39b617a18b339b48483d4))
* Introduce initial canvas view and backend storage for nodes and edges. ([d9666bf](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d9666bf3e72d9d5d5d09ffff2dd29cf0fd71e256))
* Introduce initial graph node storage, browser view component, and graph state management. ([e3f13c0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e3f13c0fefc7fa7dfbc2b132548a06731e6e2626))
* introduce monorepo structure with desktop, frontend, and backend applications, including build configurations and core API endpoints. ([b9c7700](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/b9c7700efd9cd586fef3eb6239472983ce3bb79c))
* Introduce WebNode component for embedding web content, along with foundational canvas view, graph store, and related hooks. ([ea98674](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/ea9867436a0dd035de7ec1fb4755fe4709bdc6fa))
* Landing page ([8977ed6](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8977ed6dfa43f8d121e64e6081bd0d75d730545e))
* new node created for code snippetd ([dd10023](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/dd10023109c920394caa5f79d06bd7f33301f9bb))
* set up Electron main process with window management, backend integration, deep link handling, and database initialization. ([9c56e5a](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/9c56e5ac47930cb22a8cdb4a958524b3f2a8ccaa))
* synthesis ([4a9353e](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4a9353ea0299d2fd5e96b4c7077033bf9fc5eaab))


### Bug Fixes

* add Redis-free fallback for desktop auth deep link ([0351dbc](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0351dbc0336262bdc6f7ee425111c174cefa8398))
* added outline node and some fixes ([4b88d47](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/4b88d478cfb47a0d728fc69d5fd383c757008da9))
* build fix ([8ac88af](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8ac88af1ead720a0d55e4c348ddf5989d3807c5e))
* **ci:** add checkout step and set simple release-type for release-please ([823707c](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/823707c5521e37deb4e25fe9b83af8b753714d40))
* **ci:** allow security scanning uploads to fail gracefully ([a2cc3a9](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/a2cc3a94e0a04b39ac7b3ebb564db098d06727ec))
* **ci:** define dynamic base/head commit boundaries for TruffleHog scanner ([3f95201](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/3f95201c00c830cdae88ef1155419b2b4399f969))
* **ci:** grant pull-requests read permission for paths-filter ([545f789](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/545f78972e4d75dfad7dd2ccfb701e5f84beb203))
* **ci:** remove invalid RELEASE_PLEASE_TOKEN to use default GITHUB_TOKEN ([a3e2d8c](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/a3e2d8c966286f05d4922e29390d1beab4a48081))
* **ci:** support render PR previews for image-backed services ([209d9be](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/209d9bef3fe2534c83fb1e65b4414024d370e41a))
* **ci:** sync render deploy webhook secrets with repository ([761c42d](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/761c42d0e14748c07c6d2e25de0fc8f7b8f7651a))
* **ci:** update CodeQL actions to v4 and fix SARIF upload permissions ([6fd84dd](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/6fd84dd102e0b8bb278b7023689802ceb581fe52))
* **desktop:** generate and use proper .ico file for NSIS installer instead of png ([e75a848](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e75a848732962b1cb2c545fee1f277aaa9089862))
* **desktop:** remove alpha channel from NSIS setup images to prevent blank rendering ([d249ba8](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d249ba859777d61971f565923edb49e4f77eae05))
* don't prompt sign-in immediately after sign out in SettingsModal ([8bba3dc](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8bba3dcf72538a9cbb9fd0a7dd3c868ee90abdcc))
* fix desktop redirect after login ([711d367](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/711d3674c01ade8fe43ddd999b18884776c7cbb6))
* fixed canvas node edge connections ([2202ba7](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/2202ba7cc1bb0462951d5369ec74034be32ac57d))
* general fixes ([bf648e3](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/bf648e3d411f1684445e3880edca981b84a4eafb))
* general fixes ([1c066f0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1c066f0f277ad5f7e5fa050cc73ccad396bc902e))
* general fixes ([7f09bf0](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/7f09bf0cf04b1a66d29c9609655fc803c63a6345))
* general fixes ([8ac90eb](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8ac90ebaaf7e44d6189c031452ad1663c7476c28))
* general fixes ([697b1e2](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/697b1e2cff9f7c1a4a9b214eac85315931f66dbc))
* general fixes ([81fe211](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/81fe211e2e677d3a8fc1db4bb103a8b4c858d9ca))
* general fixes ([7d81a63](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/7d81a636523725d5c12956246f77542089afc991))
* general fixes ([c0343e7](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/c0343e798261464771e3b882ce464c25508ff025))
* general fixes ([5a565cc](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/5a565cc6f5760960a5f6bfa2a94590877c01f2fc))
* general fixes ([8ed17d6](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/8ed17d6c1af3c5d14a86ddd9c1f6a9c7fa8e105f))
* inject production API URL into desktop build via build.yml ([46b861f](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/46b861f38404d4a59f3306282cbf70d9c60038ef))
* remove unused imports blocking CI lint ([caeeb18](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/caeeb1815fe74770e62af3cc27828c7c00347848))
* replace all router.push('/sign-in') in SettingsModal with Electron-aware handleSignIn ([313ce9c](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/313ce9c6b87f799130e346b787cc21077eec398d))
* replace router.push('/sign-in') in AuthGuardModal with Electron-aware openLogin ([d4bbdfb](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d4bbdfb74b8f063abd0db70c109f5a391cb91907))
* resolve all CI lint errors to unblock Render deploy ([1d56aa9](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/1d56aa9e429da65f8036a291bcdfd3b114d342dc))
* send device_id in exchange payload so sessions capture device info (not just desktop_device_id for Redis) ([0479571](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/0479571bd72a6223b70b27173e26c2e7e7d3f457))
* show success screen after desktop deep link redirect instead of spinner ([e9447f3](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/e9447f3d501b8a67fa1c375609102d13f3917f71))
* sync lock file and fix CI workflows ([d00626a](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/d00626ad4212ccad9670c7c6851fea5ba9d6fc31))
* tab title fix ([bd3d1af](https://github.com/zakaur-rahman/Rabbit-Hole-OS/commit/bd3d1af03af65792d6656034b5c460f7b2930683))
