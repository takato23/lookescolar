[
  {
    "indexname": "photos_event_approved_created_idx",
    "indexdef": "CREATE INDEX photos_event_approved_created_idx ON public.photos USING btree (event_id, approved, created_at DESC) WHERE (approved = true)"
  },
  {
    "indexname": "photos_code_approved_created_idx",
    "indexdef": "CREATE INDEX photos_code_approved_created_idx ON public.photos USING btree (code_id, approved, created_at) WHERE (approved = true)"
  }
]


2-

[
  {
    "null_approved": 0
  }
]

3-

[
  {
    "column_default": "false",
    "is_nullable": "NO"
  }
]

---


Public gallery aun:

PublicGallery.tsx:63  GET http://localhost:3000/api/gallery/c8455305-2315-4aec-9fd8-ae05b38589d9?page=1&limit=24 400 (Bad Request)
PublicGallery.useCallback[fetchPhotos] @ PublicGallery.tsx:63
PublicGallery.useEffect @ PublicGallery.tsx:102
react_stack_bottom_frame @ react-dom-client.development.js:23638
runWithFiberInDEV @ react-dom-client.development.js:873
commitHookEffectListMount @ react-dom-client.development.js:12296
commitHookPassiveMountEffects @ react-dom-client.development.js:12417
reconnectPassiveEffects @ react-dom-client.development.js:14514
recursivelyTraverseReconnectPassiveEffects @ react-dom-client.development.js:14485
commitPassiveMountOnFiber @ react-dom-client.development.js:14444
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14409
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14341
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14331
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14465
recursivelyTraversePassiveMountEffects @ react-dom-client.development.js:14311
commitPassiveMountOnFiber @ react-dom-client.development.js:14350
flushPassiveEffects @ react-dom-client.development.js:16289
flushPendingEffects @ react-dom-client.development.js:16250
flushSpawnedWork @ react-dom-client.development.js:16216
commitRoot @ react-dom-client.development.js:15949
commitRootWhenReady @ react-dom-client.development.js:15179
performWorkOnRoot @ react-dom-client.development.js:15098
performSyncWorkOnRoot @ react-dom-client.development.js:16782
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:16628
processRootScheduleInMicrotask @ react-dom-client.development.js:16666
eval @ react-dom-client.development.js:16801
"use client"
PublicGalleryPage @ page.tsx:65
initializeElement @ react-server-dom-webpack-client.browser.development.js:1207
eval @ react-server-dom-webpack-client.browser.development.js:2830
initializeModelChunk @ react-server-dom-webpack-client.browser.development.js:1109
readChunk @ react-server-dom-webpack-client.browser.development.js:935
react_stack_bottom_frame @ react-dom-client.development.js:23660
createChild @ react-dom-client.development.js:5465
reconcileChildrenArray @ react-dom-client.development.js:5772
reconcileChildFibersImpl @ react-dom-client.development.js:6095
eval @ react-dom-client.development.js:6200
reconcileChildren @ react-dom-client.development.js:8754
beginWork @ react-dom-client.development.js:11028
runWithFiberInDEV @ react-dom-client.development.js:873
performUnitOfWork @ react-dom-client.development.js:15678
workLoopConcurrentByScheduler @ react-dom-client.development.js:15672
renderRootConcurrent @ react-dom-client.development.js:15647
performWorkOnRoot @ react-dom-client.development.js:14941
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16767
performWorkUntilDeadline @ scheduler.development.js:45
<PublicGalleryPage>
initializeFakeTask @ react-server-dom-webpack-client.browser.development.js:2408
resolveDebugInfo @ react-server-dom-webpack-client.browser.development.js:2433
processFullStringRow @ react-server-dom-webpack-client.browser.development.js:2634
processFullBinaryRow @ react-server-dom-webpack-client.browser.development.js:2606
processBinaryChunk @ react-server-dom-webpack-client.browser.development.js:2733
progress @ react-server-dom-webpack-client.browser.development.js:2997
"use server"
ResponseInstance @ react-server-dom-webpack-client.browser.development.js:1870
createResponseFromOptions @ react-server-dom-webpack-client.browser.development.js:2858
exports.createFromReadableStream @ react-server-dom-webpack-client.browser.development.js:3228
eval @ app-index.js:131
(app-pages-browser)/./node_modules/next/dist/client/app-index.js @ main-app.js?v=1755375103239:149
options.factory @ webpack.js:1
__webpack_require__ @ webpack.js:1
fn @ webpack.js:1
eval @ app-next-dev.js:14
eval @ app-bootstrap.js:62
loadScriptsInSequence @ app-bootstrap.js:23
appBootstrap @ app-bootstrap.js:56
eval @ app-next-dev.js:13
(app-pages-browser)/./node_modules/next/dist/client/app-next-dev.js @ main-app.js?v=1755375103239:171
options.factory @ webpack.js:1
__webpack_require__ @ webpack.js:1
__webpack_exec__ @ main-app.js?v=1755375103239:1790
(anonymous) @ main-app.js?v=1755375103239:1791
webpackJsonpCallback @ webpack.js:1
(anonymous) @ main-app.js?v=1755375103239:9Understand this error
PublicGallery.tsx:92 Error fetching gallery: Error: Error al cargar las fotos
    at PublicGallery.useCallback[fetchPhotos] (PublicGallery.tsx:75:19)