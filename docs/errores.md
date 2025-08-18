

al intenitar comprar fotografias en la tienda: 

PublicGallery.tsx:279  POST http://localhost:3000/api/gallery/checkout 500 (Internal Server Error)

PublicGallery.tsx:295 [Service] Public checkout error: Error: Internal server error
    at onClick (PublicGallery.tsx:290:31)



3-

 las fotografias subidas tienen mucha calidad, deberian tener poca calidad sino ocupa n muchoe spacio y se peud descargar

4- cuando etiuqetio a alguien:

page.tsx:259  POST http://localhost:3000/api/admin/tagging 404 (Not Found)
handlePhotoTag @ page.tsx:259
PhotoGalleryModern.useCallback[handleManualTag] @ PhotoGalleryModern.tsx:1169
handleTag @ TaggingModal.tsx:132
handleConfirmTag @ TaggingModal.tsx:149
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277Understand this error
PhotoGalleryModern.tsx:1188 Error tagging photo manually: Error: Error tagging photo
    at handlePhotoTag (page.tsx:266:13)
    at async PhotoGalleryModern.useCallback[handleManualTag] (PhotoGalleryModern.tsx:1169:7)
    at async handleTag (TaggingModal.tsx:132:7)
error @ intercept-console-error.js:57
PhotoGalleryModern.useCallback[handleManualTag] @ PhotoGalleryModern.tsx:1188
await in PhotoGalleryModern.useCallback[handleManualTag]
handleTag @ TaggingModal.tsx:132
handleConfirmTag @ TaggingModal.tsx:149
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277Understand this error
TaggingModal.tsx:136 Error tagging photo: Error: Error tagging photo
    at handlePhotoTag (page.tsx:266:13)
    at async PhotoGalleryModern.useCallback[handleManualTag] (PhotoGalleryModern.tsx:1169:7)
    at async handleTag (TaggingModal.tsx:132:7)





    ---------


----

6-- SI no etiueqeto , en "Fotos del evento" die "3 fotos necesitan ser etiquetadas": PEro no puedo verlas porque dice lo de etiqeutarlas. Que no haga falta etiuqetarlas, que tambien las puedas mover ahi manualmente. 


7-  link publico http://localhost:3000/gallery/c8455305-2315-4aec-9fd8-ae05b38589d9
http://localhost:3000/admin/events/c8455305-2315-4aec-9fd8-ae05b38589d9

8- las fotos se ven con la watermark. pero sila clickeo, tineen resolucion de varios megapixeles, deberia ser una iamgen mas chica. adjunto foto 

9- cuando pongo "COntiunar el pago", me dice

PublicGallery.tsx:279  POST http://localhost:3000/api/gallery/checkout 404 (Not Found)
onClick @ PublicGallery.tsx:279
executeDispatch @ react-dom-client.development.js:16922
runWithFiberInDEV @ react-dom-client.development.js:873
processDispatchQueue @ react-dom-client.development.js:16972
eval @ react-dom-client.development.js:17573
batchedUpdates$1 @ react-dom-client.development.js:3313
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17126
dispatchEvent @ react-dom-client.development.js:21309
dispatchDiscreteEvent @ react-dom-client.development.js:21277
<button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:345
_c @ button.tsx:169
react_stack_bottom_frame @ react-dom-client.development.js:23553
renderWithHooksAgain @ react-dom-client.development.js:6864
renderWithHooks @ react-dom-client.development.js:6776
updateForwardRef @ react-dom-client.development.js:8778
beginWork @ react-dom-client.development.js:11019
runWithFiberInDEV @ react-dom-client.development.js:873
performUnitOfWork @ react-dom-client.development.js:15678
workLoopSync @ react-dom-client.development.js:15498
renderRootSync @ react-dom-client.development.js:15478
performWorkOnRoot @ react-dom-client.development.js:14942
performSyncWorkOnRoot @ react-dom-client.development.js:16782
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:16628
processRootScheduleInMicrotask @ react-dom-client.development.js:16666
eval @ react-dom-client.development.js:16801
<Button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:345
PublicGallery @ PublicGallery.tsx:274
react_stack_bottom_frame @ react-dom-client.development.js:23553
renderWithHooksAgain @ react-dom-client.development.js:6864
renderWithHooks @ react-dom-client.development.js:6776
updateFunctionComponent @ react-dom-client.development.js:9070
beginWork @ react-dom-client.development.js:10680
runWithFiberInDEV @ react-dom-client.development.js:873
performUnitOfWork @ react-dom-client.development.js:15678
workLoopSync @ react-dom-client.development.js:15498
renderRootSync @ react-dom-client.development.js:15478
performWorkOnRoot @ react-dom-client.development.js:14942
performSyncWorkOnRoot @ react-dom-client.development.js:16782
flushSyncWorkAcrossRoots_impl @ react-dom-client.development.js:16628
processRootScheduleInMicrotask @ react-dom-client.development.js:16666
eval @ react-dom-client.development.js:16801Understand this error
PublicGallery.tsx:295 [Service] Public checkout error: Error: Event not found
    at onClick (PublicGallery.tsx:290:31)


    